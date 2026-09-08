/**
 * usage-service switched from gzip to zstd.
 * The ingestor has to read both:
 * - zstd for what the new producer writes
 * - gzip for messages already on the topic and for anything a rollback produces
 *
 */

import {
  compressGzip,
  compressZstd,
  decompress,
  ZSTD_MAGIC,
  type RawReport,
} from '@hive/usage-common';

const reports: RawReport[] = Array.from({ length: 50 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  target: '00000000-0000-4000-8000-000000000001',
  organization: '00000000-0000-4000-8000-000000000002',
  size: 2,
  map: {
    [`key-${i}`]: {
      key: `key-${i}`,
      operation: `query op${i} { field${i} { id name } }`,
      operationName: `op${i}`,
      fields: [`Query.field${i}`, `Field${i}.id`, `Field${i}.name`],
    },
  },
  operations: [
    {
      operationMapKey: `key-${i}`,
      timestamp: Date.now() + i,
      expiresAt: Date.now() + i + 86_400_000,
      execution: { ok: true, duration: 1_000_000 + i, errorsTotal: 0 },
      metadata: { client: { name: 'client', version: '1.0.0' } },
    },
  ],
  subscriptionOperations: [],
}));

async function readAsIngestor(value: Buffer): Promise<RawReport[]> {
  return JSON.parse((await decompress(value)).toString());
}

test('reads the zstd payload from usage-service', async () => {
  const message = await compressZstd(JSON.stringify(reports));
  await expect(readAsIngestor(message)).resolves.toEqual(reports);
});

test('reads the gzip payload from usage-service (legacy)', async () => {
  const message = await compressGzip(JSON.stringify(reports));
  await expect(readAsIngestor(message)).resolves.toEqual(reports);
});

test('assert the first bytes are correct for zstd and gzip', async () => {
  const zstd = await compressZstd(JSON.stringify(reports));
  const gzip = await compressGzip(JSON.stringify(reports));
  expect([...zstd.subarray(0, 4)]).toEqual(ZSTD_MAGIC);
  expect([...gzip.subarray(0, 2)]).toEqual([0x1f, 0x8b]);
});
