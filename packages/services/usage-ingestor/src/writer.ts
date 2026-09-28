import Agent from 'agentkeepalive';
import { got, Response as GotResponse } from 'got';
import type { ServiceLogger } from '@hive/service-common';
import { metrics } from '@hive/service-common';
import { compressGzip } from '@hive/usage-common';
import * as Sentry from '@sentry/node';
import {
  failingMessages,
  ingestedOperationErrorsFailures,
  ingestedOperationErrorsWrites,
  ingestedOperationRegistryFailures,
  ingestedOperationRegistryWrites,
  ingestedOperationsFailures,
  ingestedOperationsWrites,
  writeDuration,
} from './metrics';
import {
  appDeploymentUsageOrder,
  joinIntoSingleMessage,
  operationErrorsOrder,
  operationsOrder,
  registryOrder,
  subscriptionOperationsOrder,
} from './serializer';

export interface ClickHouseConfig {
  protocol: string;
  host: string;
  port: number;
  username: string;
  password: string;
  async_insert_busy_timeout_ms: number;
  async_insert_max_data_size: number;
  max_sockets: number;
  write_retry_backoff_ms: number;
  /**
   * How long one insert may keep failing, while other inserts to the same table succeed,
   * before its message is given up on. Must stay well below the time the fleet takes to
   * insert 10000 messages: that is the size of ClickHouse's deduplication log per table, and
   * everything behind a stuck message is replayed after a restart.
   */
  write_give_up_after_ms: number;
}

export interface WriteOptions {
  /**
   * Identifies the reports the rows came from. ClickHouse skips an insert whose token it
   * has already applied to the same table, so retries and replays are not double counted.
   */
  deduplicationToken: string;
  /**
   * Human readable origin (topic/partition@offset) for logs.
   */
  source: string;
  /**
   * Aborts the message's other inserts once one of them is given up on. Combined with the
   * writer's own signal, which aborts everything on destroy.
   */
  signal?: AbortSignal;
}

type Counter = InstanceType<typeof metrics.Counter>;

interface RowMetrics {
  rows: number;
  writes: Counter;
  failures: Counter;
}

/**
 * Keeps `usage_ingestor_failing_messages` at the number of messages with at least one insert in
 * the retry loop, however many of a message's five inserts are failing at once.
 */
interface FailingMessages {
  markFailing(source: string): void;
  markRecovered(source: string): void;
}

const MAX_RETRY_BACKOFF_MS = 30_000;

/**
 * An insert kept failing past the give-up budget while other inserts to the same table
 * succeeded, so the failure is specific to this message. The caller drops the message and
 * commits its offset instead of leaving the partition stuck (see `writeCsv`).
 */
export class WriteGivenUpError extends Error {
  override readonly name = 'WriteGivenUpError';

  constructor(
    readonly details: {
      query: string;
      source: string;
      deduplicationToken: string;
      attempts: number;
      failingForMs: number;
      status: number | undefined;
      clickhouseError: string | undefined;
    },
    readonly reason: unknown,
  ) {
    super(
      `Gave up on an insert for ${details.source} after ${details.attempts} attempts over ${details.failingForMs}ms: ${
        reason instanceof Error ? reason.message : String(reason)
      }`,
    );
  }
}

/**
 * A write was abandoned because its signal was aborted: the writer was destroyed, or the
 * message was given up on another table and its remaining inserts were cancelled.
 */
export class WriteAbortedError extends Error {
  override readonly name = 'WriteAbortedError';

  constructor(
    readonly query: string,
    readonly reason: unknown,
  ) {
    super(`Write aborted: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
}

const operationsFields = operationsOrder.join(', ');
const subscriptionOperationsFields = subscriptionOperationsOrder.join(', ');
const registryFields = registryOrder.join(', ');
const appDeploymentUsageFields = appDeploymentUsageOrder.join(', ');
const operationErrorsFields = operationErrorsOrder.join(', ');

export const tables = [
  'operation_collection',
  'operations',
  'subscription_operations',
  'app_deployment_usage',
  'operation_errors',
] as const;

export type Table = (typeof tables)[number];

/**
 * `cancelled` means the insert was aborted because another table gave up; it may or may not
 * have reached ClickHouse. `failed` is an unexpected error other than a give-up or an abort.
 */
export type TableOutcome = 'succeeded' | 'gave-up' | 'cancelled' | 'failed';

export interface MessageRows {
  registryRecords: string[];
  operations: string[];
  subscriptionOperations: string[];
  appDeploymentUsageRecords: string[];
  errorRecords: string[];
}

export type WriteMessageResult =
  | { status: 'acknowledged' }
  | { status: 'given-up'; error: WriteGivenUpError; outcomes: Record<Table, TableOutcome> };

export function createWriter({
  clickhouse,
  logger,
}: {
  clickhouse: ClickHouseConfig;
  logger: ServiceLogger;
}) {
  const agentConfig: Agent.HttpOptions = {
    // Keep sockets around in a pool to be used by other requests in the future
    keepAlive: true,
    // Sets the working socket to timeout after N ms of inactivity on the working socket
    timeout: clickhouse.async_insert_busy_timeout_ms + 60_000,
    // Sets the free socket to timeout after N ms of inactivity on the free socket
    freeSocketTimeout: 30_000,
    // Sets the socket active time to live
    socketActiveTTL: clickhouse.async_insert_busy_timeout_ms + 60_000,
    maxSockets: clickhouse.max_sockets,
    maxFreeSockets: clickhouse.max_sockets,
    scheduling: 'lifo',
  };
  const httpAgent = new Agent(agentConfig);
  const httpsAgent = new Agent.HttpsAgent(agentConfig);
  const abortController = new AbortController();
  const failingWritesBySource = new Map<string, number>();
  /** Time of the last acknowledged insert per query, for the give-up rule in `writeCsv`. */
  const lastSuccessAt = new Map<string, number>();
  const failing: FailingMessages = {
    markFailing(source) {
      const count = failingWritesBySource.get(source) ?? 0;
      if (count === 0) {
        failingMessages.inc();
      }
      failingWritesBySource.set(source, count + 1);
    },
    markRecovered(source) {
      const count = failingWritesBySource.get(source) ?? 0;
      if (count > 1) {
        failingWritesBySource.set(source, count - 1);
        return;
      }
      failingWritesBySource.delete(source);
      if (count === 1) {
        failingMessages.dec();
      }
    },
  };

  const agents = {
    http: httpAgent,
    https: httpsAgent,
  };

  async function write(
    query: string,
    rows: string[],
    options: WriteOptions,
    rowMetrics: RowMetrics | null,
  ) {
    if (rows.length === 0) {
      return;
    }

    const csv = joinIntoSingleMessage(rows);
    const compressed = await compressGzip(csv);

    await writeCsv({
      config: clickhouse,
      agents,
      query,
      body: compressed,
      logger,
      maxRetry: 3,
      options,
      rowMetrics,
      failing,
      lastSuccessAt,
      signal: options.signal
        ? AbortSignal.any([abortController.signal, options.signal])
        : abortController.signal,
    });
  }

  function writeOperations(operations: string[], options: WriteOptions) {
    // Note that `SETTINGS input_format_with_names_use_header = 1` is enabled by default.
    // If migrating this table in the future, be sure to double check this via
    // SELECT name, value, changed, description FROM system.settings WHERE name = 'input_format_with_names_use_header';
    return write(
      `INSERT INTO operations (${operationsFields})
        FORMAT CSV`,
      operations,
      options,
      {
        rows: operations.length,
        writes: ingestedOperationsWrites,
        failures: ingestedOperationsFailures,
      },
    );
  }

  function writeSubscriptionOperations(operations: string[], options: WriteOptions) {
    return write(
      `INSERT INTO subscription_operations (${subscriptionOperationsFields}) FORMAT CSV`,
      operations,
      options,
      {
        rows: operations.length,
        writes: ingestedOperationsWrites,
        failures: ingestedOperationsFailures,
      },
    );
  }

  function writeRegistry(records: string[], options: WriteOptions) {
    return write(
      `INSERT INTO operation_collection (${registryFields}) FORMAT CSV`,
      records,
      options,
      {
        rows: records.length,
        writes: ingestedOperationRegistryWrites,
        failures: ingestedOperationRegistryFailures,
      },
    );
  }

  function writeAppDeploymentUsage(records: string[], options: WriteOptions) {
    return write(
      `INSERT INTO "app_deployment_usage" (${appDeploymentUsageFields}) FORMAT CSV`,
      records,
      options,
      null,
    );
  }

  function writeOperationErrors(records: string[], options: WriteOptions) {
    return write(
      `INSERT INTO operation_errors (${operationErrorsFields}) FORMAT CSV`,
      records,
      options,
      {
        rows: records.length,
        writes: ingestedOperationErrorsWrites,
        failures: ingestedOperationErrorsFailures,
      },
    );
  }

  /**
   * Writes one message's rows to all five tables. Resolves `acknowledged` once every table
   * has acknowledged, or `given-up` once one insert was given up on (see `writeCsv`): the
   * message's remaining inserts are cancelled and the outcome per table is reported so the
   * caller can drop the message and commit its offset. Rejects when the writes were abandoned
   * for any other reason (the writer being destroyed at shutdown, an unexpected error), which
   * must leave the offset uncommitted so the message is replayed.
   */
  async function writeMessage(
    rows: MessageRows,
    options: { deduplicationToken: string; source: string },
  ): Promise<WriteMessageResult> {
    // Lets a give-up on one table cancel the message's other inserts, so a dead message does
    // not keep retrying and holding sockets and bytes.
    const messageAbort = new AbortController();
    const writeOptions: WriteOptions = { ...options, signal: messageAbort.signal };
    const writes: Record<Table, Promise<unknown>> = {
      operation_collection: writeRegistry(rows.registryRecords, writeOptions),
      operations: writeOperations(rows.operations, writeOptions),
      subscription_operations: writeSubscriptionOperations(
        rows.subscriptionOperations,
        writeOptions,
      ),
      app_deployment_usage: writeAppDeploymentUsage(rows.appDeploymentUsageRecords, writeOptions),
      operation_errors: writeOperationErrors(rows.errorRecords, writeOptions),
    };

    const results = await Promise.allSettled(
      tables.map(table =>
        writes[table].catch((error: unknown) => {
          if (error instanceof WriteGivenUpError) {
            messageAbort.abort();
          }
          throw error;
        }),
      ),
    );

    const outcomes = {} as Record<Table, TableOutcome>;
    let givenUp: WriteGivenUpError | null = null;
    let firstRejection: PromiseRejectedResult | null = null;
    for (const [index, table] of tables.entries()) {
      const result = results[index];
      if (!result || result.status === 'fulfilled') {
        outcomes[table] = 'succeeded';
        continue;
      }
      firstRejection ??= result;
      if (result.reason instanceof WriteGivenUpError) {
        outcomes[table] = 'gave-up';
        givenUp ??= result.reason;
      } else if (result.reason instanceof WriteAbortedError) {
        outcomes[table] = 'cancelled';
      } else {
        outcomes[table] = 'failed';
      }
    }

    if (givenUp) {
      return { status: 'given-up', error: givenUp, outcomes };
    }
    if (firstRejection) {
      throw firstRejection.reason;
    }
    return { status: 'acknowledged' };
  }

  return {
    writeOperations,
    writeSubscriptionOperations,
    writeRegistry,
    writeAppDeploymentUsage,
    writeOperationErrors,
    writeMessage,
    destroy() {
      abortController.abort();
      httpAgent.destroy();
      httpsAgent.destroy();
    },
  };
}

/**
 * Sends the insert and, once got's own retries are exhausted, keeps retrying the identical
 * request with backoff until it succeeds, the writer is destroyed, or the message is given up
 * on. Because the body and the deduplication token never change, ClickHouse applies at most
 * one copy no matter how many attempts reach it.
 *
 * Retries are unbounded while the failure looks systemic (a ClickHouse outage, a schema
 * lagging a deploy, a table missing during a migration): then every message fails at once,
 * holding them until the in-flight byte cap pauses consumption is the intended backpressure,
 * and the rows flow again the moment the cause is fixed, with no restart or replay.
 *
 * A message is given up on only when its insert has been failing for longer than
 * `write_give_up_after_ms` and another insert to the same table has succeeded since this one
 * first failed, which proves the failure is specific to this message. That bound matters
 * because a stuck message freezes its partition's commit offset while later messages keep
 * flowing: after a restart everything behind it is replayed, and ClickHouse only remembers the
 * last 10000 tokens per table. The caller drops the message, commits its offset and logs the
 * payload; a dead-letter queue is future work.
 */
async function writeCsv(args: {
  config: ClickHouseConfig;
  agents: {
    http: Agent;
    https: Agent.HttpsAgent;
  };
  query: string;
  body: Buffer;
  logger: ServiceLogger;
  maxRetry: number;
  options: WriteOptions;
  rowMetrics: RowMetrics | null;
  failing: FailingMessages;
  lastSuccessAt: Map<string, number>;
  signal: AbortSignal;
}) {
  const { config, logger, query, options, rowMetrics, failing, lastSuccessAt, signal } = args;
  let attempt = 0;
  let markedFailing = false;
  let firstFailureAt: number | null = null;

  try {
    for (;;) {
      try {
        const response = await sendCsv(args);
        lastSuccessAt.set(query, Date.now());
        rowMetrics?.writes.inc(rowMetrics.rows);
        return response;
      } catch (error) {
        if (signal.aborted) {
          // The writer is being destroyed, or the message was given up on another table:
          // not a failure of this insert.
          throw new WriteAbortedError(query, error);
        }

        rowMetrics?.failures.inc(rowMetrics.rows);
        if (!markedFailing) {
          markedFailing = true;
          failing.markFailing(options.source);
        }

        attempt += 1;
        const now = Date.now();
        firstFailureAt ??= now;
        const failingForMs = now - firstFailureAt;
        const tableSucceededSince = (lastSuccessAt.get(query) ?? 0) > firstFailureAt;
        const context = {
          query,
          source: options.source,
          deduplicationToken: options.deduplicationToken,
          rows: rowMetrics?.rows,
          bodyBytes: args.body.byteLength,
          attempt,
          failingForMs,
          tableSucceededSince,
          status: getStatusCodeFromError(error),
          clickhouseError: getResponseBody(error),
          error: error instanceof Error ? error.message : String(error),
        };

        if (failingForMs >= config.write_give_up_after_ms && tableSucceededSince) {
          logger.error(
            context,
            'Write failed past the give-up budget while other inserts to the table succeed - giving up on the message',
          );
          throw new WriteGivenUpError(
            {
              query,
              source: options.source,
              deduplicationToken: options.deduplicationToken,
              attempts: attempt,
              failingForMs,
              status: context.status,
              clickhouseError: context.clickhouseError,
            },
            error,
          );
        }

        const delay = Math.min(
          config.write_retry_backoff_ms * 2 ** (attempt - 1),
          MAX_RETRY_BACKOFF_MS,
        );
        logger.error(
          { ...context, retryInMs: delay },
          'Write failed - offset not committed, retrying the same insert in place',
        );

        await sleep(delay, signal);

        if (signal.aborted) {
          throw new WriteAbortedError(query, error);
        }
      }
    }
  } finally {
    if (markedFailing) {
      failing.markRecovered(options.source);
    }
  }
}

function sendCsv({
  config,
  agents,
  query,
  body,
  logger,
  maxRetry,
  options,
  signal,
}: {
  config: ClickHouseConfig;
  agents: {
    http: Agent;
    https: Agent.HttpsAgent;
  };
  query: string;
  body: Buffer;
  logger: ServiceLogger;
  maxRetry: number;
  options: WriteOptions;
  signal: AbortSignal;
}) {
  const stopTimer = writeDuration.startTimer({
    query,
    destination: config.host,
  });
  return got
    .post(`${config.protocol ?? 'https'}://${config.host}:${config.port}`, {
      body,
      signal,
      searchParams: {
        query,
        async_insert: 1,
        // The Kafka offset is committed once this request resolves, so the acknowledgement
        // has to mean the rows are persisted, not merely queued.
        wait_for_async_insert: 1,
        async_insert_busy_timeout_ms: config.async_insert_busy_timeout_ms,
        async_insert_max_data_size: config.async_insert_max_data_size,
        // The adaptive busy timeout ClickHouse enables by default starts at 50ms and only grows when
        // inserts arrive within 50ms of each other; at this insert rate the configured timeout
        // would never apply and every INSERT would become its own part.
        async_insert_use_adaptive_busy_timeout: 0,
        async_insert_deduplicate: 1,
        insert_deduplication_token: options.deduplicationToken,
        // Without this a materialized view whose insert failed after the source insert
        // succeeded would never receive the retry, because the source skips it as a duplicate.
        deduplicate_blocks_in_dependent_materialized_views: 1,
      },
      username: config.username,
      password: config.password,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/csv',
        'Content-Encoding': 'gzip',
      },
      retry: {
        calculateDelay(info) {
          if (info.attemptCount >= maxRetry) {
            logger.warn(
              'Exceeded the retry limit (%s/%s) for %s',
              info.attemptCount,
              maxRetry,
              query,
            );
            // After N retries, stop.
            return 0;
          }

          logger.debug('Retry %s/%s for %s', info.attemptCount, maxRetry, query);

          return info.attemptCount * 500;
        },
      },
      timeout: {
        lookup: 2000,
        connect: 2000,
        secureConnect: 2000,
        request: config.async_insert_busy_timeout_ms + 30_000,
      },
      agent: {
        http: agents.http,
        https: agents.https,
      },
    })
    .then(response => {
      stopTimer({
        status: response.statusCode,
      });
      return response;
    })
    .catch(error => {
      stopTimer({
        status: getStatusCodeFromError(error) ?? 'unknown',
      });
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          clickhouse_host: config.host,
        },
        extra: {
          query,
          source: options.source,
          deduplicationToken: options.deduplicationToken,
          status: getStatusCodeFromError(error),
          clickhouseError: getResponseBody(error),
          clickhouse: {
            protocol: config.protocol,
            host: config.host,
            port: config.port,
          },
        },
      });
      return Promise.reject(error);
    });
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

function hasResponse(error: unknown): error is {
  response: GotResponse;
} {
  return error instanceof Error && 'response' in error && typeof error.response === 'object';
}

function getStatusCodeFromError(error: unknown) {
  if (hasResponse(error)) {
    return error.response?.statusCode;
  }
}

const MAX_LOGGED_RESPONSE_CHARS = 1000;

function getResponseBody(error: unknown) {
  if (!hasResponse(error)) {
    return undefined;
  }
  const body: unknown = error.response?.body;
  if (typeof body === 'string') {
    return body.slice(0, MAX_LOGGED_RESPONSE_CHARS);
  }
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8', 0, MAX_LOGGED_RESPONSE_CHARS);
  }
  return undefined;
}
