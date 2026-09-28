import nock from 'nock';
import {
  failingMessages,
  ingestedOperationsFailures,
  ingestedOperationsWrites,
  poisonPillMessages,
} from '../src/metrics';
import { createWriter, WriteAbortedError, WriteGivenUpError } from '../src/writer';

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
  write_give_up_after_ms: 50,
};

const options = { deduplicationToken: 'a'.repeat(64), source: 'usage_reports/0@1' };

function buildLogger() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as any;
}

beforeEach(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

test('sends a durable, deduplicated async insert', async () => {
  const queries: Record<string, string>[] = [];
  const scope = nock('http://clickhouse.test:8123')
    .post('/')
    .query(query => {
      queries.push(query as Record<string, string>);
      return true;
    })
    .reply(200, '{}');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  await writer.writeOperations(['row'], options);
  writer.destroy();

  expect(scope.isDone()).toBe(true);
  expect(queries[0]).toMatchObject({
    async_insert: '1',
    wait_for_async_insert: '1',
    async_insert_busy_timeout_ms: '100',
    async_insert_use_adaptive_busy_timeout: '0',
    async_insert_deduplicate: '1',
    insert_deduplication_token: options.deduplicationToken,
    deduplicate_blocks_in_dependent_materialized_views: '1',
  });
  expect(queries[0].query).toMatch(/^INSERT INTO operations/);
});

test('skips the request entirely when there are no rows', async () => {
  const scope = nock('http://clickhouse.test:8123').post('/').reply(200, '{}');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  await writer.writeOperations([], options);
  writer.destroy();

  expect(scope.isDone()).toBe(false);
});

test('after the HTTP retries are exhausted it retries the same insert in place until it succeeds', async () => {
  const tokens: string[] = [];
  const scope = nock('http://clickhouse.test:8123')
    .post('/')
    .query(query => {
      tokens.push((query as Record<string, string>).insert_deduplication_token);
      return true;
    })
    .times(4)
    .reply(500, 'boom')
    .post('/')
    .query(true)
    .reply(200, '{}');
  const poisonSpy = vi.spyOn(poisonPillMessages, 'inc');
  const failingIncSpy = vi.spyOn(failingMessages, 'inc');
  const failingDecSpy = vi.spyOn(failingMessages, 'dec');
  const writesSpy = vi.spyOn(ingestedOperationsWrites, 'inc');
  const failuresSpy = vi.spyOn(ingestedOperationsFailures, 'inc');
  const logger = buildLogger();
  const writer = createWriter({ clickhouse, logger });

  await writer.writeOperations(['row', 'row'], options);
  writer.destroy();

  expect(scope.isDone()).toBe(true);
  expect(tokens).toHaveLength(4);
  expect(new Set(tokens)).toEqual(new Set([options.deduplicationToken]));
  expect(poisonSpy).not.toHaveBeenCalled();
  expect(failingIncSpy).toHaveBeenCalledTimes(1);
  expect(failingDecSpy).toHaveBeenCalledTimes(1);
  expect(failuresSpy).toHaveBeenCalledTimes(1);
  expect(failuresSpy).toHaveBeenCalledWith(2);
  expect(writesSpy).toHaveBeenCalledTimes(1);
  expect(writesSpy).toHaveBeenCalledWith(2);
  expect(logger.error.mock.calls.at(-1)![1]).toEqual(
    'Write failed - offset not committed, retrying the same insert in place',
  );
  expect(logger.error.mock.calls.at(-1)![0]).toMatchObject({
    source: options.source,
    deduplicationToken: options.deduplicationToken,
    rows: 2,
    attempt: 1,
    status: 500,
    clickhouseError: 'boom',
  });

  poisonSpy.mockRestore();
  failingIncSpy.mockRestore();
  failingDecSpy.mockRestore();
  writesSpy.mockRestore();
  failuresSpy.mockRestore();
}, 15_000);

test('a message with several failing inserts counts once in the failing-messages gauge', async () => {
  for (const table of ['operations', 'operation_collection']) {
    const matches = (query: Record<string, string>) =>
      query.query.startsWith(`INSERT INTO ${table} `);
    nock('http://clickhouse.test:8123')
      .post('/')
      .query(matches)
      .times(3)
      .reply(500, 'boom')
      .post('/')
      .query(matches)
      .reply(200, '{}');
  }
  const failingIncSpy = vi.spyOn(failingMessages, 'inc');
  const failingDecSpy = vi.spyOn(failingMessages, 'dec');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  await Promise.all([
    writer.writeOperations(['row'], options),
    writer.writeRegistry(['record'], options),
  ]);
  writer.destroy();

  expect(failingIncSpy).toHaveBeenCalledTimes(1);
  expect(failingDecSpy).toHaveBeenCalledTimes(1);
  failingIncSpy.mockRestore();
  failingDecSpy.mockRestore();
}, 15_000);

test('destroying the writer stops an in-place retry loop without counting a write', async () => {
  nock('http://clickhouse.test:8123').post('/').query(true).reply(500, 'boom').persist();
  const writesSpy = vi.spyOn(ingestedOperationsWrites, 'inc');
  const failingDecSpy = vi.spyOn(failingMessages, 'dec');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  const write = writer.writeOperations(['row'], options);
  await new Promise(resolve => setTimeout(resolve, 2000));
  writer.destroy();

  await expect(write).rejects.toThrow();
  expect(writesSpy).not.toHaveBeenCalled();
  expect(failingDecSpy).toHaveBeenCalledTimes(1);
  writesSpy.mockRestore();
  failingDecSpy.mockRestore();
}, 15_000);

test('the request timeout covers the busy timeout the insert waits for', async () => {
  const scope = nock('http://clickhouse.test:8123')
    .post('/')
    .query(true)
    .delay(clickhouse.async_insert_busy_timeout_ms + 200)
    .reply(200, '{}');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  await expect(writer.writeOperations(['row'], options)).resolves.toBeUndefined();
  writer.destroy();
  expect(scope.isDone()).toBe(true);
});

async function waitFor(predicate: () => boolean, timeoutMs = 10_000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('gives up on an insert that keeps failing past the budget once another insert to the same table has succeeded', async () => {
  const bad = { deduplicationToken: 'b'.repeat(64), source: 'usage_reports/0@2' };
  const good = { deduplicationToken: 'c'.repeat(64), source: 'usage_reports/0@3' };
  nock('http://clickhouse.test:8123')
    .post('/')
    .query(query => query.insert_deduplication_token === bad.deduplicationToken)
    .reply(500, 'boom')
    .persist();
  nock('http://clickhouse.test:8123')
    .post('/')
    .query(query => query.insert_deduplication_token === good.deduplicationToken)
    .reply(200, '{}')
    .persist();
  const logger = buildLogger();
  const failingIncSpy = vi.spyOn(failingMessages, 'inc');
  const failingDecSpy = vi.spyOn(failingMessages, 'dec');
  const writer = createWriter({ clickhouse, logger });

  const failing = writer.writeOperations(['row'], bad);
  // The rule needs a success on the same table after the first failure.
  await waitFor(() =>
    logger.error.mock.calls.some(
      ([, msg]) => msg === 'Write failed - offset not committed, retrying the same insert in place',
    ),
  );
  await writer.writeOperations(['row'], good);

  await expect(failing).rejects.toBeInstanceOf(WriteGivenUpError);
  const error = (await failing.catch(e => e)) as WriteGivenUpError;
  expect(error.details).toMatchObject({
    source: bad.source,
    deduplicationToken: bad.deduplicationToken,
    status: 500,
    clickhouseError: 'boom',
  });
  expect(error.details.attempts).toBeGreaterThanOrEqual(2);
  expect(error.details.failingForMs).toBeGreaterThanOrEqual(clickhouse.write_give_up_after_ms);
  expect(logger.error.mock.calls.at(-1)![1]).toEqual(
    'Write failed past the give-up budget while other inserts to the table succeed - giving up on the message',
  );
  expect(failingIncSpy).toHaveBeenCalledTimes(1);
  expect(failingDecSpy).toHaveBeenCalledTimes(1);

  writer.destroy();
  failingIncSpy.mockRestore();
  failingDecSpy.mockRestore();
}, 20_000);

test('does not give up while every insert to the table is failing', async () => {
  nock('http://clickhouse.test:8123').post('/').query(true).reply(500, 'boom').persist();
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  const failing = writer.writeOperations(['row'], options);
  let settled = false;
  failing.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  // Several attempts, all far past the 50ms budget, but nothing else succeeded on the table.
  await new Promise(resolve => setTimeout(resolve, 3500));
  expect(settled).toBe(false);

  writer.destroy();
  await expect(failing).rejects.toBeInstanceOf(WriteAbortedError);
}, 15_000);

test('an insert aborted mid-request is not counted as a failure', async () => {
  nock('http://clickhouse.test:8123').post('/').query(true).delay(1000).reply(200, '{}');
  const failuresSpy = vi.spyOn(ingestedOperationsFailures, 'inc');
  const failingIncSpy = vi.spyOn(failingMessages, 'inc');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  const write = writer.writeOperations(['row'], options);
  await new Promise(resolve => setTimeout(resolve, 100));
  writer.destroy();

  await expect(write).rejects.toBeInstanceOf(WriteAbortedError);
  expect(failuresSpy).not.toHaveBeenCalled();
  expect(failingIncSpy).not.toHaveBeenCalled();
  failuresSpy.mockRestore();
  failingIncSpy.mockRestore();
});

const emptyRows = {
  registryRecords: [],
  operations: [],
  subscriptionOperations: [],
  appDeploymentUsageRecords: [],
  errorRecords: [],
};

test('writeMessage resolves acknowledged once every table has acknowledged', async () => {
  const scope = nock('http://clickhouse.test:8123').post('/').query(true).times(3).reply(200, '{}');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  await expect(
    writer.writeMessage(
      { ...emptyRows, registryRecords: ['record'], operations: ['row'], errorRecords: ['err'] },
      options,
    ),
  ).resolves.toEqual({ status: 'acknowledged' });
  writer.destroy();

  expect(scope.isDone()).toBe(true);
});

test('writeMessage gives up on one table after another message succeeded on it, cancels the rest and reports the outcome per table', async () => {
  const bad = { deduplicationToken: 'd'.repeat(64), source: 'usage_reports/0@4' };
  const good = { deduplicationToken: 'e'.repeat(64), source: 'usage_reports/0@5' };
  // Every insert of the bad message fails; only its operations insert will see a success from
  // another message on the same table, so only that one gives up.
  nock('http://clickhouse.test:8123')
    .post('/')
    .query(query => query.insert_deduplication_token === bad.deduplicationToken)
    .reply(500, 'boom')
    .persist();
  nock('http://clickhouse.test:8123')
    .post('/')
    .query(query => query.insert_deduplication_token === good.deduplicationToken)
    .reply(200, '{}')
    .persist();
  const logger = buildLogger();
  const writer = createWriter({ clickhouse, logger });

  const result = writer.writeMessage(
    { ...emptyRows, registryRecords: ['record'], operations: ['row'] },
    bad,
  );
  await waitFor(() =>
    logger.error.mock.calls.some(
      ([arg, msg]) =>
        msg === 'Write failed - offset not committed, retrying the same insert in place' &&
        String(arg.query).startsWith('INSERT INTO operations'),
    ),
  );
  await writer.writeMessage({ ...emptyRows, operations: ['row'] }, good);

  await expect(result).resolves.toMatchObject({
    status: 'given-up',
    outcomes: {
      operations: 'gave-up',
      operation_collection: 'cancelled',
      subscription_operations: 'succeeded',
      app_deployment_usage: 'succeeded',
      operation_errors: 'succeeded',
    },
  });
  writer.destroy();
}, 20_000);

test('writeMessage rejects when the writer is destroyed mid-retry, so the offset stays uncommitted', async () => {
  nock('http://clickhouse.test:8123').post('/').query(true).reply(500, 'boom').persist();
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  const result = writer.writeMessage({ ...emptyRows, operations: ['row'] }, options);
  await new Promise(resolve => setTimeout(resolve, 200));
  writer.destroy();

  await expect(result).rejects.toBeInstanceOf(WriteAbortedError);
});
