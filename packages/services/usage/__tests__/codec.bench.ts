import { constants, gunzipSync, gzipSync, zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import { bench, describe } from 'vitest';
import { faker } from '@faker-js/faker';
import { compressGzip, compressZstd } from '@hive/usage-common';
import { usageProcessorV2 } from '../src/usage-processor-2';

faker.seed(42);

function createNameGenerator(): () => string {
  return () => `f${faker.string.alphanumeric(10)}`;
}

function makeDocument(nextName: () => string, fieldCount: number) {
  const fields = Array.from({ length: fieldCount }, nextName);
  const operationName = nextName();
  return {
    operation: `query ${operationName} {\n${fields.map(f => `  ${f} { id name }`).join('\n')}\n}`,
    operationName,
    fields: fields.map(f => `Query.${f}`),
  };
}

interface Shape {
  name: string;
  /** Operations per report */
  operations: number;
  /** Map records per report */
  records: number;
  /** Fields per document */
  fields: number;
  targets: number;
  /** Documents in each target's map */
  docs: number;
  /** Subgraph fetches per operation */
  subgraphs?: number;
}

const SHAPES: Shape[] = [
  { name: 'tiny, heavy reuse', operations: 5, records: 3, fields: 10, targets: 5, docs: 5 },
  { name: 'production typical', operations: 28, records: 10, fields: 20, targets: 20, docs: 30 },
  { name: 'typical, low reuse', operations: 28, records: 10, fields: 20, targets: 200, docs: 200 },
  { name: 'single target', operations: 28, records: 10, fields: 20, targets: 1, docs: 20 },
  { name: 'wide field lists', operations: 28, records: 10, fields: 200, targets: 20, docs: 30 },
  { name: 'huge documents', operations: 28, records: 10, fields: 500, targets: 10, docs: 15 },
  { name: 'many ops, few docs', operations: 500, records: 5, fields: 20, targets: 10, docs: 8 },
  {
    name: 'many docs per report',
    operations: 100,
    records: 100,
    fields: 20,
    targets: 10,
    docs: 300,
  },
  { name: 'high target count', operations: 28, records: 10, fields: 20, targets: 200, docs: 5 },
  {
    name: 'large client batches',
    operations: 2000,
    records: 100,
    fields: 50,
    targets: 5,
    docs: 200,
  },
  {
    name: 'federated (4 subgraphs)',
    operations: 28,
    records: 10,
    fields: 20,
    targets: 20,
    docs: 30,
    subgraphs: 4,
  },
];

const noop = () => {};
const logger = { child: () => logger, debug: noop, info: noop, warn: noop, error: noop } as any;

function buildBatch(shape: Shape, targetBytes = 2_000_000): Buffer {
  const nextName = createNameGenerator();
  const catalogues = Array.from({ length: shape.targets }, () =>
    Array.from({ length: shape.docs }, () => makeDocument(nextName, shape.fields)),
  );

  const reports: unknown[] = [];
  let bytes = 0;
  for (let r = 0; bytes < targetBytes; r++) {
    const catalogue = catalogues[r % shape.targets];
    const map: Record<string, unknown> = {};
    for (let i = 0; i < shape.records; i++) {
      map[`key${i}`] = catalogue[(r * 7 + i) % shape.docs];
    }
    const record = catalogue[r % shape.docs];
    const result = usageProcessorV2(
      logger,
      {
        size: shape.operations,
        map,
        operations: Array.from({ length: shape.operations }, (_, i) => ({
          operationMapKey: `key${i % shape.records}`,
          timestamp: 1756200000000 + i,
          execution: {
            ok: true,
            duration: 1000 + i,
            errorsTotal: 0,
            ...(shape.subgraphs
              ? {
                  fetches: Array.from({ length: shape.subgraphs }, (_, s) => ({
                    start: s * 10,
                    duration: 100 + s,
                    fields: Object.fromEntries(
                      record.fields.slice(s, s + 8).map(f => [f, 1 + (i % 3)]),
                    ),
                    subgraph: `subgraph-${s}`,
                    paths: 'Query',
                    type: 'ROOT' as const,
                    errors: [
                      { coordinate: record.fields[s % record.fields.length], code: `E${s}` },
                    ],
                  })),
                }
              : {}),
          },
          metadata: { client: { name: `c${i % 3}`, version: '1.0.0' } },
        })),
      },
      {
        targetId: `target-${r % shape.targets}`,
        projectId: 'project',
        organizationId: 'organization',
      },
      365,
    );
    if (!result.success) {
      throw new Error(`fixture "${shape.name}" is invalid: ${JSON.stringify(result.errors[0])}`);
    }
    reports.push(result.report);
    bytes += JSON.stringify(result.report).length;
  }
  return Buffer.from(JSON.stringify(reports), 'utf8');
}

interface Codec {
  name: string;
  compress: (buffer: Buffer) => Buffer;
  decompress: (buffer: Buffer) => Buffer;
}

function zstd(level: number, windowLog?: number): Codec {
  const params: Record<number, number> = { [constants.ZSTD_c_compressionLevel]: level };
  if (windowLog) {
    params[constants.ZSTD_c_windowLog] = windowLog;
  }
  return {
    name: `zstd L${level} ${windowLog ? `w${windowLog}` : 'w-default'}`,
    compress: buffer => zstdCompressSync(buffer, { params }),
    decompress: buffer => zstdDecompressSync(buffer),
  };
}

function gzip(level: number): Codec {
  return {
    name: `gzip L${level}`,
    compress: buffer => gzipSync(buffer, { level }),
    decompress: buffer => gunzipSync(buffer),
  };
}

const CODECS: Codec[] = [
  gzip(1),
  gzip(6), // what usage-service did before zstd
  gzip(9),
  zstd(1),
  zstd(1, 21),
  zstd(1, 23), // what usage-service does now
  zstd(1, 25),
  zstd(3, 23),
  zstd(6, 23),
];

const batches = SHAPES.map(shape => ({ shape, buffer: buildBatch(shape) }));

const compressionRatioOf = new Map<string, Map<string, number>>();
for (const { shape, buffer } of batches) {
  const byCodec = new Map<string, number>();
  for (const codec of CODECS) {
    const out = codec.compress(buffer);
    if (!codec.decompress(out).equals(buffer)) {
      throw new Error(
        `${codec.name} does not yield the same payload when decompressing on "${shape.name}"`,
      );
    }
    byCodec.set(codec.name, buffer.byteLength / out.byteLength);
  }
  compressionRatioOf.set(shape.name, byCodec);
}

const COMPRESS_TIMING = { time: 200, warmupTime: 50 } as const;
const DECOMPRESS_TIMING = { time: 500, warmupTime: 100 } as const;

for (const { shape, buffer } of batches) {
  const megabytes = (buffer.byteLength / 1_000_000).toFixed(2);
  const byCodec = compressionRatioOf.get(shape.name)!;
  const label = (codec: Codec) =>
    `${codec.name} - ${byCodec.get(codec.name)!.toFixed(1)}x compression`;

  describe(`compress: ${shape.name} (${megabytes}MB batch)`, () => {
    for (const codec of CODECS) {
      bench(
        label(codec),
        () => {
          codec.compress(buffer);
        },
        COMPRESS_TIMING,
      );
    }
  });

  describe(`decompress: ${shape.name} (${megabytes}MB batch)`, () => {
    for (const codec of CODECS) {
      const compressed = codec.compress(buffer);
      bench(
        label(codec),
        () => {
          codec.decompress(compressed);
        },
        DECOMPRESS_TIMING,
      );
    }
  });
}

const typical = batches[1].buffer.toString('utf8');

describe('as production compresses it', () => {
  bench(
    'compressZstd()',
    async () => {
      await compressZstd(typical);
    },
    COMPRESS_TIMING,
  );

  bench(
    'compressGzip() - compression before',
    async () => {
      await compressGzip(typical);
    },
    COMPRESS_TIMING,
  );
});
