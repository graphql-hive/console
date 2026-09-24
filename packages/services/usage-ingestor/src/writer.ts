import Agent from 'agentkeepalive';
import { got, Response as GotResponse } from 'got';
import type { ServiceLogger } from '@hive/service-common';
import { metrics } from '@hive/service-common';
import { compressGzip } from '@hive/usage-common';
import * as Sentry from '@sentry/node';
import {
  ingestedOperationErrorsFailures,
  ingestedOperationErrorsWrites,
  ingestedOperationRegistryFailures,
  ingestedOperationRegistryWrites,
  ingestedOperationsFailures,
  ingestedOperationsWrites,
  poisonPillMessages,
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
}

type Counter = InstanceType<typeof metrics.Counter>;

interface RowMetrics {
  rows: number;
  writes: Counter;
  failures: Counter;
}

const MAX_RETRY_BACKOFF_MS = 30_000;

const operationsFields = operationsOrder.join(', ');
const subscriptionOperationsFields = subscriptionOperationsOrder.join(', ');
const registryFields = registryOrder.join(', ');
const appDeploymentUsageFields = appDeploymentUsageOrder.join(', ');
const operationErrorsFields = operationErrorsOrder.join(', ');

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
      signal: abortController.signal,
    });
  }

  return {
    writeOperations(operations: string[], options: WriteOptions) {
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
    },
    writeSubscriptionOperations(operations: string[], options: WriteOptions) {
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
    },
    writeRegistry(records: string[], options: WriteOptions) {
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
    },
    writeAppDeploymentUsage(records: string[], options: WriteOptions) {
      return write(
        `INSERT INTO "app_deployment_usage" (${appDeploymentUsageFields}) FORMAT CSV`,
        records,
        options,
        null,
      );
    },
    writeOperationErrors(records: string[], options: WriteOptions) {
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
    },
    destroy() {
      abortController.abort();
      httpAgent.destroy();
      httpsAgent.destroy();
    },
  };
}

/**
 * Sends the insert and, once got's own retries are exhausted, keeps retrying the identical
 * request with backoff until it succeeds or the writer is destroyed. Because the body and
 * the deduplication token never change, ClickHouse applies at most one copy no matter how
 * many attempts reach it.
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
  signal: AbortSignal;
}) {
  const { config, logger, query, options, rowMetrics, signal } = args;
  let attempt = 0;

  for (;;) {
    try {
      const response = await sendCsv(args);
      rowMetrics?.writes.inc(rowMetrics.rows);
      return response;
    } catch (error) {
      rowMetrics?.failures.inc(rowMetrics.rows);

      if (signal.aborted) {
        throw error;
      }

      attempt += 1;
      poisonPillMessages.inc();
      const delay = Math.min(
        config.write_retry_backoff_ms * 2 ** (attempt - 1),
        MAX_RETRY_BACKOFF_MS,
      );
      logger.error(
        {
          query,
          source: options.source,
          deduplicationToken: options.deduplicationToken,
          rows: rowMetrics?.rows,
          bodyBytes: args.body.byteLength,
          attempt,
          retryInMs: delay,
          error: error instanceof Error ? error.message : String(error),
        },
        'Write failed - offset not committed, retrying the same insert in place',
      );

      await sleep(delay, signal);

      if (signal.aborted) {
        throw error;
      }
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
