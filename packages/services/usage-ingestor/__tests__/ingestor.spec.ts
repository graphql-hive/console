import type { KafkaMessage } from 'kafkajs';
import { compressZstd, type RawReport } from '@hive/usage-common';
import { processMessage } from '../src/ingestor';
import { poisonPillMessages } from '../src/metrics';
import type { createProcessor } from '../src/processor';
import type { createWriter } from '../src/writer';

const rawReports: RawReport[] = [
  {
    id: '00000000-0000-4000-8000-000000000000',
    target: 'target-1',
    organization: 'org-1',
    size: 1,
    map: {
      key1: {
        key: 'key1',
        operation: 'query op { field }',
        operationName: 'op',
        fields: ['Query.field'],
      },
    },
    operations: [
      {
        operationMapKey: 'key1',
        timestamp: Date.now(),
        execution: { ok: true, duration: 1, errorsTotal: 0 },
        metadata: { client: { name: 'client', version: '1.0.0' } },
      },
    ],
    subscriptionOperations: [],
  },
];

async function buildMessage(): Promise<KafkaMessage> {
  const value = await compressZstd(JSON.stringify(rawReports));
  return {
    key: null,
    value,
    timestamp: String(Date.now()),
    attributes: 0,
    offset: '123',
    headers: {},
  };
}

function buildLogger() {
  return {
    error: vi.fn(),
    debug: vi.fn(),
  } as any;
}

function buildProcessor(): ReturnType<typeof createProcessor> {
  return {
    processReports: vi.fn().mockResolvedValue({
      registryRecords: ['reg1'],
      operations: ['op1'],
      subscriptionOperations: [],
      appDeploymentUsageRecords: [],
      errors: [],
    }),
  };
}

test('permanent operations-write failure increments the poison-pill counter and logs a bounded summary plus the full payload at debug', async () => {
  const processor = buildProcessor();
  const writer: ReturnType<typeof createWriter> = {
    writeRegistry: vi.fn().mockResolvedValue(undefined),
    writeOperations: vi.fn().mockRejectedValue(new Error('clickhouse rejected the insert')),
    writeSubscriptionOperations: vi.fn().mockResolvedValue(undefined),
    writeAppDeploymentUsage: vi.fn().mockResolvedValue(undefined),
    writeOperationErrors: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };
  const logger = buildLogger();
  const message = await buildMessage();
  const incSpy = vi.spyOn(poisonPillMessages, 'inc');

  await expect(
    processMessage({ processor, writer, message, logger, topic: 'usage_reports', partition: 2 }),
  ).rejects.toThrow('clickhouse rejected the insert');

  expect(incSpy).toHaveBeenCalledTimes(1);

  const [summaryArg, summaryMsg] = logger.error.mock.calls.at(-1)!;
  expect(summaryMsg).toEqual(
    'Report write failed - offset not committed, message will be reprocessed',
  );
  expect(summaryArg).toMatchObject({
    topic: 'usage_reports',
    partition: 2,
    offset: '123',
    reportCount: 1,
    totalOperations: 1,
    targets: ['target-1'],
    organizations: ['org-1'],
  });
  expect(summaryArg.rawReports).toBeUndefined();

  const [debugArg, debugMsg] = logger.debug.mock.calls.at(-1)!;
  expect(debugMsg).toEqual('Poison pill message full payload');
  expect(debugArg.rawReports).toEqual(rawReports);

  incSpy.mockRestore();
});

test('a registry-only failure does not touch the poison-pill counter (not retried)', async () => {
  const processor = buildProcessor();
  const writer: ReturnType<typeof createWriter> = {
    writeRegistry: vi.fn().mockRejectedValue(new Error('registry write failed')),
    writeOperations: vi.fn().mockResolvedValue(undefined),
    writeSubscriptionOperations: vi.fn().mockResolvedValue(undefined),
    writeAppDeploymentUsage: vi.fn().mockResolvedValue(undefined),
    writeOperationErrors: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };
  const logger = buildLogger();
  const message = await buildMessage();
  const incSpy = vi.spyOn(poisonPillMessages, 'inc');

  await expect(
    processMessage({ processor, writer, message, logger, topic: 'usage_reports', partition: 0 }),
  ).resolves.toBeUndefined();

  expect(incSpy).not.toHaveBeenCalled();

  incSpy.mockRestore();
});

test('a corrupt/unparseable message increments the poison-pill counter and logs what is available, without a report summary', async () => {
  const processor = buildProcessor();
  const writer: ReturnType<typeof createWriter> = {
    writeRegistry: vi.fn().mockResolvedValue(undefined),
    writeOperations: vi.fn().mockResolvedValue(undefined),
    writeSubscriptionOperations: vi.fn().mockResolvedValue(undefined),
    writeAppDeploymentUsage: vi.fn().mockResolvedValue(undefined),
    writeOperationErrors: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };
  const logger = buildLogger();
  const corruptMessage: KafkaMessage = {
    key: null,
    value: Buffer.from('not-a-valid-compressed-payload'),
    timestamp: String(Date.now()),
    attributes: 0,
    offset: '999',
    headers: {},
  };
  const incSpy = vi.spyOn(poisonPillMessages, 'inc');

  await expect(
    processMessage({
      processor,
      writer,
      message: corruptMessage,
      logger,
      topic: 'usage_reports',
      partition: 4,
    }),
  ).rejects.toThrow();

  expect(incSpy).toHaveBeenCalledTimes(1);
  expect(processor.processReports).not.toHaveBeenCalled();

  const [errorArg, errorMsg] = logger.error.mock.calls.at(-1)!;
  expect(errorMsg).toEqual(
    'Report decompression/parsing failed - offset not committed, message will be reprocessed',
  );
  expect(errorArg).toMatchObject({
    topic: 'usage_reports',
    partition: 4,
    offset: '999',
    messageBytes: corruptMessage.value!.byteLength,
  });
  expect(errorArg.reportCount).toBeUndefined();
  expect(errorArg.targets).toBeUndefined();

  const [debugArg, debugMsg] = logger.debug.mock.calls.at(-1)!;
  expect(debugMsg).toEqual('Poison pill message full payload');
  expect(debugArg.value).toEqual(corruptMessage.value!.toString('base64'));

  incSpy.mockRestore();
});
