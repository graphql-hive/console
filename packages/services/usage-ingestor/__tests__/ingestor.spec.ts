import { createHash } from 'node:crypto';
import type { KafkaMessage } from 'kafkajs';
import { compressZstd, type RawReport } from '@hive/usage-common';
import { createInflightTracker } from '../src/inflight';
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
    warn: vi.fn(),
    debug: vi.fn(),
  } as any;
}

const processedRows = {
  registryRecords: ['reg1'],
  operations: ['op1', 'op2'],
  subscriptionOperations: ['sub1'],
  appDeploymentUsageRecords: ['app1'],
  errors: ['err1'],
};

function buildProcessor(): ReturnType<typeof createProcessor> {
  return {
    processReports: vi.fn().mockResolvedValue(processedRows),
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

type WriterMock = ReturnType<typeof createWriter>;
const writeMethods = [
  'writeRegistry',
  'writeOperations',
  'writeSubscriptionOperations',
  'writeAppDeploymentUsage',
  'writeOperationErrors',
] as const;

function buildWriter(overrides: Partial<WriterMock> = {}): WriterMock {
  return {
    writeRegistry: vi.fn().mockResolvedValue(undefined),
    writeOperations: vi.fn().mockResolvedValue(undefined),
    writeSubscriptionOperations: vi.fn().mockResolvedValue(undefined),
    writeAppDeploymentUsage: vi.fn().mockResolvedValue(undefined),
    writeOperationErrors: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    ...overrides,
  };
}

function buildTracker() {
  const onCommit = vi.fn().mockResolvedValue(undefined);
  const tracker = createInflightTracker({
    maxBytes: 1_000_000,
    commitIntervalMs: 1000,
    onCommit,
    logger: buildLogger(),
  });
  return { tracker, onCommit };
}

const heartbeat = () => Promise.resolve();

test('tags every write with a token derived from the message bytes and resolves before the writes settle', async () => {
  const processor = buildProcessor();
  const pending = deferred();
  const writer = buildWriter({ writeOperations: vi.fn().mockReturnValue(pending.promise) });
  const tracker = { waitForCapacity: vi.fn().mockResolvedValue(undefined), track: vi.fn() };
  const message = await buildMessage();
  const expectedToken = createHash('sha256').update(message.value!).digest('hex');

  await expect(
    processMessage({
      processor,
      writer,
      tracker,
      message,
      heartbeat,
      logger: buildLogger(),
      topic: 'usage_reports',
      partition: 2,
    }),
  ).resolves.toBeUndefined();

  const options = { deduplicationToken: expectedToken, source: 'usage_reports/2@123' };
  expect(writer.writeRegistry).toHaveBeenCalledWith(processedRows.registryRecords, options);
  expect(writer.writeOperations).toHaveBeenCalledWith(processedRows.operations, options);
  expect(writer.writeSubscriptionOperations).toHaveBeenCalledWith(
    processedRows.subscriptionOperations,
    options,
  );
  expect(writer.writeAppDeploymentUsage).toHaveBeenCalledWith(
    processedRows.appDeploymentUsageRecords,
    options,
  );
  expect(writer.writeOperationErrors).toHaveBeenCalledWith(processedRows.errors, options);

  const expectedBytes = Object.values(processedRows)
    .flat()
    .reduce((sum, row) => sum + row.length, 0);
  expect(tracker.waitForCapacity).toHaveBeenCalledWith(expectedBytes, heartbeat);
  expect(tracker.track).toHaveBeenCalledWith({
    topic: 'usage_reports',
    partition: 2,
    offset: '123',
    bytes: expectedBytes,
    promise: expect.any(Promise),
  });

  pending.resolve();
});

test('two copies of the same message bytes produce the same token', async () => {
  const message = await buildMessage();
  const tokens: string[] = [];
  const writer = buildWriter({
    writeOperations: vi.fn((_rows, options) => {
      tokens.push(options.deduplicationToken);
      return Promise.resolve();
    }),
  });
  const tracker = { waitForCapacity: vi.fn().mockResolvedValue(undefined), track: vi.fn() };

  for (const offset of ['1', '2']) {
    await processMessage({
      processor: buildProcessor(),
      writer,
      tracker,
      message: { ...message, offset },
      heartbeat,
      logger: buildLogger(),
      topic: 'usage_reports',
      partition: 0,
    });
  }

  expect(tokens).toHaveLength(2);
  expect(tokens[0]).toEqual(tokens[1]);
});

describe('the offset is committed only once every table has acknowledged', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.each(writeMethods)('%s pending keeps the offset uncommitted', async method => {
    const pending = deferred();
    const writer = buildWriter({ [method]: vi.fn().mockReturnValue(pending.promise) });
    const { tracker, onCommit } = buildTracker();
    const message = await buildMessage();

    await processMessage({
      processor: buildProcessor(),
      writer,
      tracker,
      message,
      heartbeat,
      logger: buildLogger(),
      topic: 'usage_reports',
      partition: 0,
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(onCommit).not.toHaveBeenCalled();

    pending.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onCommit).toHaveBeenCalledWith([
      { topic: 'usage_reports', partition: 0, offset: '124' },
    ]);
  });
});

test('a corrupt/unparseable message increments the poison-pill counter and logs', async () => {
  const processor = buildProcessor();
  const writer = buildWriter();
  const tracker = { waitForCapacity: vi.fn().mockResolvedValue(undefined), track: vi.fn() };
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
      tracker,
      message: corruptMessage,
      heartbeat,
      logger,
      topic: 'usage_reports',
      partition: 4,
    }),
  ).rejects.toThrow();

  expect(incSpy).toHaveBeenCalledTimes(1);
  expect(processor.processReports).not.toHaveBeenCalled();
  expect(tracker.track).not.toHaveBeenCalled();

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
