import { createHash } from 'node:crypto';
import type { KafkaMessage } from 'kafkajs';
import nock from 'nock';
import { compressZstd, type RawReport } from '@hive/usage-common';
import { createInflightTracker } from '../src/inflight';
import { createIngestor, processMessage } from '../src/ingestor';
import { committedOffsetLag, poisonPillMessages } from '../src/metrics';
import type { createProcessor } from '../src/processor';
import type { createWriter } from '../src/writer';

const fakeConsumer = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  pause: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
  commitOffsets: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('kafkajs', () => ({
  Kafka: class {
    consumer() {
      return fakeConsumer;
    }
  },
  logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 4, DEBUG: 5 },
}));

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

test('tags every write with a hash of the report ids and resolves before the writes settle', async () => {
  const processor = buildProcessor();
  const pending = deferred();
  const writer = buildWriter({ writeOperations: vi.fn().mockReturnValue(pending.promise) });
  const tracker = { waitForCapacity: vi.fn().mockResolvedValue(undefined), track: vi.fn() };
  const message = await buildMessage();
  const expectedToken = createHash('sha256')
    .update(rawReports.map(report => report.id).join(','))
    .digest('hex');

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

test('two copies of the same message produce the same token, and different reports do not', async () => {
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

  const otherReports = rawReports.map(report => ({ ...report, id: 'other-report-id' }));
  await processMessage({
    processor: buildProcessor(),
    writer,
    tracker,
    message: { ...message, value: await compressZstd(JSON.stringify(otherReports)) },
    heartbeat,
    logger: buildLogger(),
    topic: 'usage_reports',
    partition: 0,
  });

  expect(tokens).toHaveLength(3);
  expect(tokens[0]).toEqual(tokens[1]);
  expect(tokens[2]).toEqual(createHash('sha256').update('other-report-id').digest('hex'));
  expect(tokens[2]).not.toEqual(tokens[0]);
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

describe('createIngestor', () => {
  const clickhouse = {
    protocol: 'http',
    host: 'clickhouse.test',
    port: 8123,
    username: 'user',
    password: 'pass',
    async_insert_busy_timeout_ms: 100,
    async_insert_max_data_size: 1000,
    max_sockets: 5,
    write_retry_backoff_ms: 10,
  };

  function build() {
    fakeConsumer.run.mockClear();
    fakeConsumer.on.mockClear();
    fakeConsumer.pause.mockClear();
    fakeConsumer.disconnect.mockClear();
    fakeConsumer.commitOffsets.mockClear();
    const ingestor = createIngestor({
      logger: { ...buildLogger(), info: vi.fn() },
      clickhouse,
      inflight: { maxBytes: 1_000_000, commitIntervalMs: 60_000, shutdownDeadlineMs: 5_000 },
      kafka: {
        topic: 'usage_reports',
        consumerGroup: 'test-group',
        concurrency: 1,
        connection: { broker: 'localhost:9092', ssl: false, sasl: null },
      },
    });
    const handlers = () =>
      Object.fromEntries(fakeConsumer.on.mock.calls.map(([event, handler]) => [event, handler]));
    return { ingestor, handlers };
  }

  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('runs the consumer without auto-commit and reports ready', async () => {
    const { ingestor } = build();

    await ingestor.start();

    expect(fakeConsumer.run).toHaveBeenCalledTimes(1);
    expect(fakeConsumer.run.mock.calls[0][0]).toMatchObject({
      autoCommit: false,
      partitionsConsumedConcurrently: 1,
    });
    expect(ingestor.readiness()).toBe(true);
  });

  test('commits an acknowledged message on shutdown, after pausing and before disconnecting', async () => {
    nock('http://clickhouse.test:8123').post('/').query(true).reply(200, '{}').persist();
    const { ingestor, handlers } = build();
    const lagSpy = vi.spyOn(committedOffsetLag, 'set');
    await ingestor.start();
    const { eachMessage } = fakeConsumer.run.mock.calls[0][0];
    const message = await buildMessage();

    await eachMessage({
      topic: 'usage_reports',
      partition: 0,
      message,
      heartbeat,
      pause: () => () => {},
    });
    handlers()['consumer.end_batch_process']({
      payload: { topic: 'usage_reports', partition: 0, highWatermark: '124' },
    });

    await ingestor.stop();

    expect(fakeConsumer.pause).toHaveBeenCalledWith([{ topic: 'usage_reports' }]);
    expect(fakeConsumer.commitOffsets).toHaveBeenCalledWith([
      { topic: 'usage_reports', partition: 0, offset: '124' },
    ]);
    expect(fakeConsumer.pause.mock.invocationCallOrder[0]).toBeLessThan(
      fakeConsumer.commitOffsets.mock.invocationCallOrder[0],
    );
    expect(fakeConsumer.commitOffsets.mock.invocationCallOrder[0]).toBeLessThan(
      fakeConsumer.disconnect.mock.invocationCallOrder[0],
    );
    expect(lagSpy).toHaveBeenLastCalledWith({ partition: '0' }, 0);
    lagSpy.mockRestore();
  });

  test('does not commit a message ClickHouse never acknowledged, and disconnects at the deadline', async () => {
    nock('http://clickhouse.test:8123').post('/').query(true).reply(500, 'boom').persist();
    const { ingestor, handlers } = build();
    await ingestor.start();
    const { eachMessage } = fakeConsumer.run.mock.calls[0][0];

    await eachMessage({
      topic: 'usage_reports',
      partition: 0,
      message: await buildMessage(),
      heartbeat,
      pause: () => () => {},
    });
    handlers()['consumer.group_join']({ payload: { memberAssignment: { usage_reports: [0] } } });

    await ingestor.stop();

    expect(fakeConsumer.commitOffsets).not.toHaveBeenCalled();
    expect(fakeConsumer.disconnect).toHaveBeenCalledTimes(1);
  }, 20_000);
});
