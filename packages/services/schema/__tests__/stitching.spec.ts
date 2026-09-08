import { env } from 'node:process';
import { Worker } from 'node:worker_threads';
import type { CompositionEvent, CompositionResultEvent } from '@hive/schema/composition-worker';

// Helper function to wrap Worker execution in a Promise
function runWorkerWithLimits(
  workerPath: string,
  workerData: CompositionEvent['data'],
  limits: { stackMb?: number; heapMb: number; codeRangeSizeMb?: number },
) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      name: 'composition-worker-test',
      resourceLimits: {
        stackSizeMb: limits.stackMb,
        maxOldGenerationSizeMb: limits.heapMb,
        codeRangeSizeMb: limits.codeRangeSizeMb,
      },
      env: {
        ENCRYPTION_SECRET: env.ENCRYPTION_SECRET,
        REDIS_HOST: env.REDIS_HOST,
        REDIS_PORT: env.REDIS_PORT ?? '6379',
      },
    });

    worker.on('message', data => {
      if (data.event === 'error') {
        reject(data.err);
      }
      if (data.event === 'compositionResult') {
        resolve(data);
      }
    });
    worker.on('error', err => reject(err));
    worker.on('exit', code => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });

    worker.postMessage({
      event: 'composition',
      id: '1',
      data: workerData,
      taskId: '1',
      requestId: '1',
    });
  });
}

describe('stitching', () => {
  test('worker memory is exceeded when the schema size to worker size ratio drops below 150x', async () => {
    await expect(
      checkWorkerMemoryLimit({
        schemaSizeInMb: 5,
        schemaMbToWorkerMbRatio: 150,
      }),
    ).resolves.toBeTruthy();

    await expect(
      checkWorkerMemoryLimit({
        schemaSizeInMb: 5,
        schemaMbToWorkerMbRatio: 147,
      }),
    ).rejects.toThrow();
  }, 20000);
});

/**
 * Note that this limit is approximate because workers use some memory to hold code. And subtle differences in the schema can
 * cause different memory usage.
 */
const checkWorkerMemoryLimit = async (opts: {
  // The size of the schema to generate for this test.
  // This is useful as an input in case there are edge cases that involve different sizes of schemas
  schemaSizeInMb: number;
  // This is a multiplier for how much heap memory is required in the worker to handle a schema
  // of a certain size (maxMemoryMb)
  schemaMbToWorkerMbRatio: number;
}) => {
  const charactersPerMb = 1048576;
  const schema = generateGraphQLSchemaBySize(charactersPerMb * opts.schemaSizeInMb);
  const workerFilePath = require.resolve('@hive/schema/dist/composition-worker-main.js');
  const heavyInputData: CompositionEvent['data'] = {
    type: 'stitching',
    args: {
      schemas: [
        {
          raw: schema,
          source: 'test',
        },
      ],
    },
  };

  try {
    const result = (await runWorkerWithLimits(workerFilePath, heavyInputData, {
      heapMb: opts.schemaSizeInMb * opts.schemaMbToWorkerMbRatio,
    })) as CompositionResultEvent;

    // Assert that it completed without hitting engine caps
    expect(result.event).toBe('compositionResult');
    expect(typeof result.data.result.sdl).toBe('string');
    return true;
  } catch (err: any) {
    // If the thread runs completely out of memory, Node may forcefully crash the thread
    throw new Error(`The thread crashed due to exceeding resource boundaries: ${err.message}`);
  }
};

/**
 * Creates an approximation of a graphql schema that is a specific number of characters in length.
 */
function generateGraphQLSchemaBySize(targetChars: number): string {
  const MAX_FIELDS_PER_TYPE = 40;
  const SCALAR_TYPES = ['String', 'Int', 'Boolean', 'Float', 'ID'];

  let schema = 'type Query {\n  root: Type0!\n}\n\n';

  const baselineMinLength = schema.length;
  if (targetChars < baselineMinLength) {
    throw new Error(
      `Target size is too small. Minimum required length is ${baselineMinLength} characters.`,
    );
  }

  let typeIndex = 0;
  let keepGenerating = true;

  while (keepGenerating) {
    let currentType = `type Type${typeIndex} {\n  id: ID!\n`;

    // Check if adding this type shell would overshoot the limit
    if (schema.length + currentType.length + 2 >= targetChars) {
      break;
    }

    // Populate the type with various scalar fields
    for (let fieldIndex = 0; fieldIndex < MAX_FIELDS_PER_TYPE; fieldIndex++) {
      const scalarType = SCALAR_TYPES[fieldIndex % SCALAR_TYPES.length];
      const nextField = `  field${fieldIndex}: ${scalarType}!\n`;

      // Stop appending fields if it would overshoot the target limit once closed
      if (schema.length + currentType.length + nextField.length + 2 > targetChars) {
        keepGenerating = false;
        break;
      }
      currentType += nextField;
    }

    // Add an edge relationship to the *next* type to create graph depth
    const relationField = `  related: Type${typeIndex + 1}\n`;
    if (
      keepGenerating &&
      schema.length + currentType.length + relationField.length + 2 <= targetChars
    ) {
      currentType += relationField;
    } else {
      keepGenerating = false;
    }

    currentType += '}\n\n';
    schema += currentType;
    typeIndex++;
  }

  // Exactly pad any remaining bytes using GraphQL comments
  if (schema.length < targetChars) {
    schema += '#';
    while (schema.length < targetChars) {
      schema += 'x';
    }
  }

  return schema;
}
