import nock from 'nock';
import {
  ingestedOperationsFailures,
  ingestedOperationsWrites,
  poisonPillMessages,
} from '../src/metrics';
import { createWriter } from '../src/writer';

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
  const incSpy = vi.spyOn(poisonPillMessages, 'inc');
  const writesSpy = vi.spyOn(ingestedOperationsWrites, 'inc');
  const failuresSpy = vi.spyOn(ingestedOperationsFailures, 'inc');
  const logger = buildLogger();
  const writer = createWriter({ clickhouse, logger });

  await writer.writeOperations(['row', 'row'], options);
  writer.destroy();

  expect(scope.isDone()).toBe(true);
  expect(tokens).toHaveLength(4);
  expect(new Set(tokens)).toEqual(new Set([options.deduplicationToken]));
  expect(incSpy).toHaveBeenCalledTimes(1);
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
  });

  incSpy.mockRestore();
  writesSpy.mockRestore();
  failuresSpy.mockRestore();
}, 15_000);

test('destroying the writer stops an in-place retry loop without counting a write', async () => {
  nock('http://clickhouse.test:8123').post('/').query(true).reply(500, 'boom').persist();
  const writesSpy = vi.spyOn(ingestedOperationsWrites, 'inc');
  const writer = createWriter({ clickhouse, logger: buildLogger() });

  const write = writer.writeOperations(['row'], options);
  await new Promise(resolve => setTimeout(resolve, 2000));
  writer.destroy();

  await expect(write).rejects.toThrow();
  expect(writesSpy).not.toHaveBeenCalled();
  writesSpy.mockRestore();
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
