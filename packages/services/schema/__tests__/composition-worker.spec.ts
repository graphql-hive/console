import { EventEmitter } from 'node:events';
import type { MessagePort } from 'node:worker_threads';
import {
  computeSchemaChanges,
  deserializeSchemaChange,
  type SchemaDiffInput,
} from '../../api/src/modules/schema/lib/schema-diff';
import type { Logger } from '../../api/src/modules/shared/providers/logger';
import {
  createCompositionWorker,
  type CompositionEvent,
  type CompositionResultEvent,
  type ErrorResultEvent,
} from '../src/composition-worker';
import type { env } from '../src/environment';

type PostedEvent = CompositionResultEvent | ErrorResultEvent;

function createLogger(): Logger {
  const logger = {
    child: () => logger,
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
  return logger as unknown as Logger;
}

const pending = new Map<string, (event: PostedEvent) => void>();
const port = new EventEmitter() as EventEmitter & { postMessage(event: PostedEvent): void };
port.postMessage = event => pending.get(event.id)?.(event);

createCompositionWorker({
  baseLogger: createLogger(),
  port: port as unknown as MessagePort,
  env: {
    encryptionSecret: 'secret',
    compositionWorker: { trackMemoryUsage: false },
    timings: { schemaExternalCompositionTimeout: 1_000 },
    transformExternalSupergraphToPublicSdl: false,
  } as typeof env,
});

function compose(data: CompositionEvent['data']) {
  const id = crypto.randomUUID();
  const result = new Promise<PostedEvent>(resolve => pending.set(id, resolve));
  port.emit('message', {
    event: 'composition',
    id,
    taskId: id,
    requestId: 'request',
    data,
  } satisfies CompositionEvent);
  return result;
}

const invalidSchema = { raw: 'iliketurtles', source: 'stub', url: null };

test.each<CompositionEvent['data']>([
  { type: 'single', args: { schemas: [invalidSchema] } },
  { type: 'stitching', args: { schemas: [invalidSchema] } },
  {
    type: 'federation',
    args: {
      schemas: [invalidSchema],
      external: null,
      native: true,
      contracts: undefined,
      requestId: 'request',
    },
  },
])('a syntax error in a submitted $type SDL is reported as a graphql error', async data => {
  await expect(compose(data)).resolves.toMatchObject({
    event: 'compositionResult',
    data: {
      type: data.type,
      result: {
        sdl: null,
        errors: [{ source: 'graphql', message: expect.stringMatching(/Syntax Error/) }],
      },
    },
  });
});

describe('diff', () => {
  const existingSdl = /* GraphQL */ `
    type Query {
      user(id: ID): User
      users: [User!]!
    }
    type User {
      id: ID!
      name: String
      "The email"
      email: String
    }
  `;
  const incomingSdl = /* GraphQL */ `
    type Query {
      user(id: ID!): User
    }
    type User {
      id: ID!
      name: String!
      "  The email  "
      email: String
      age: Int
    }
  `;

  function diff(args: SchemaDiffInput) {
    return compose({ type: 'diff', args });
  }

  test('returns the same changes as computing the diff in-process', async () => {
    const input: SchemaDiffInput = {
      existingSdl,
      incomingSdl,
      source: 'composed',
      filterNestedChanges: true,
      filterOutFederationChanges: false,
    };

    const event = await diff(input);
    if (event.event !== 'compositionResult' || event.data.type !== 'diff') {
      throw new Error('Expected a diff result.');
    }
    const result = event.data.result;
    if (result.status !== 'completed') {
      throw new Error('Expected a completed diff.');
    }

    const local = await computeSchemaChanges(input);
    if (local.status !== 'completed') {
      throw new Error('Expected a completed diff.');
    }

    // The changes travel as JSON from the schema service to the API.
    const remote = (JSON.parse(JSON.stringify(result.changes)) as typeof result.changes).map(
      deserializeSchemaChange,
    );

    const comparable = (change: (typeof remote)[number]) => ({
      id: change.id,
      type: change.type,
      criticality: change.criticality,
      message: change.message,
      path: change.path,
      reason: change.reason,
      meta: change.meta,
      isSafeBasedOnUsage: change.isSafeBasedOnUsage,
      breakingChangeSchemaCoordinate: change.breakingChangeSchemaCoordinate,
    });

    expect(remote.map(comparable)).toEqual(local.changes.map(comparable));
    expect(remote.map(change => change.type)).toEqual(
      expect.arrayContaining([
        'FIELD_REMOVED',
        'FIELD_ADDED',
        'FIELD_ARGUMENT_TYPE_CHANGED',
        'FIELD_TYPE_CHANGED',
      ]),
    );
    // Description changes that only differ in whitespace are dropped.
    expect(remote.map(change => change.type)).not.toContain('FIELD_DESCRIPTION_CHANGED');
  });

  test('is skipped when a schema can not be built', async () => {
    await expect(
      diff({
        existingSdl,
        incomingSdl: 'iliketurtles',
        source: 'composed',
        filterNestedChanges: true,
        filterOutFederationChanges: false,
      }),
    ).resolves.toMatchObject({
      event: 'compositionResult',
      data: { type: 'diff', result: { status: 'skipped' } },
    });
  });

  test('service SDL can extend types it does not define', async () => {
    const input: SchemaDiffInput = {
      existingSdl: /* GraphQL */ `
        extend type Query {
          a: String
        }
      `,
      incomingSdl: /* GraphQL */ `
        extend type Query {
          a: String
          b: String
        }
      `,
      source: 'service',
      filterNestedChanges: false,
      filterOutFederationChanges: false,
    };

    await expect(diff(input)).resolves.toMatchObject({
      data: {
        type: 'diff',
        result: {
          status: 'completed',
          changes: [{ type: 'FIELD_ADDED', meta: { typeName: 'Query', addedFieldName: 'b' } }],
        },
      },
    });
  });

  test('filters out Federation specific changes', async () => {
    const input = (filterOutFederationChanges: boolean): SchemaDiffInput => ({
      existingSdl: /* GraphQL */ `
        type Query {
          a: String
        }
      `,
      incomingSdl: /* GraphQL */ `
        scalar join__FieldSet
        type Query {
          a: String
        }
      `,
      source: 'composed',
      filterNestedChanges: true,
      filterOutFederationChanges,
    });

    await expect(diff(input(true))).resolves.toMatchObject({
      data: { type: 'diff', result: { status: 'completed', changes: [] } },
    });
    await expect(diff(input(false))).resolves.toMatchObject({
      data: {
        type: 'diff',
        result: { status: 'completed', changes: [{ type: 'TYPE_ADDED' }] },
      },
    });
  });
});
