import Agent from 'agentkeepalive';
import { got, Response as GotResponse } from 'got';
import type { ServiceLogger } from '@hive/service-common';
import type {
  ProcessedAppDeploymentUsageRecord,
  ProcessedOperation,
  ProcessedOperationErrorRecord,
  ProcessedRegistryRecord,
  ProcessedSubscriptionOperation,
} from '@hive/usage-common';
import { compressZstdStream } from '@hive/usage-common';
import * as Sentry from '@sentry/node';
import { writeDuration } from './metrics';
import {
  appDeploymentUsageOrder,
  operationErrorsOrder,
  operationsOrder,
  registryOrder,
  serializeAppDeploymentUsageRowBinary,
  serializeOperationErrorsRowBinary,
  serializeOperationsRowBinary,
  serializeRegistryRecordsRowBinary,
  serializeSubscriptionOperationsRowBinary,
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
  wait_for_async_insert: number;
}

const operationsFields = operationsOrder.join(', ');
const subscriptionOperationsFields = subscriptionOperationsOrder.join(', ');
const registryFields = registryOrder.join(', ');
const appDeploymentUsageFields = appDeploymentUsageOrder.join(', ');
const operationErrorsFields = operationErrorsOrder.join(', ');

const agentConfig: Agent.HttpOptions = {
  // Keep sockets around in a pool to be used by other requests in the future
  keepAlive: true,
  // Sets the working socket to timeout after N ms of inactivity on the working socket
  timeout: 60_000,
  // Sets the free socket to timeout after N ms of inactivity on the free socket
  freeSocketTimeout: 30_000,
  // Sets the socket active time to live
  socketActiveTTL: 60_000,
  maxSockets: 10,
  maxFreeSockets: 10,
  scheduling: 'lifo',
};

export function createWriter({
  clickhouse,
  logger,
}: {
  clickhouse: ClickHouseConfig;
  logger: ServiceLogger;
}) {
  const httpAgent = new Agent(agentConfig);
  const httpsAgent = new Agent.HttpsAgent(agentConfig);

  const agents = {
    http: httpAgent,
    https: httpsAgent,
  };

  return {
    async writeOperations(operations: ProcessedOperation[]) {
      await writeRecords(
        clickhouse,
        agents,
        'operations',
        operationsFields,
        operations,
        serializeOperationsRowBinary,
        logger,
      );
    },
    async writeSubscriptionOperations(operations: ProcessedSubscriptionOperation[]) {
      await writeRecords(
        clickhouse,
        agents,
        'subscription_operations',
        subscriptionOperationsFields,
        operations,
        serializeSubscriptionOperationsRowBinary,
        logger,
      );
    },
    async writeRegistry(records: ProcessedRegistryRecord[]) {
      await writeRecords(
        clickhouse,
        agents,
        'operation_collection',
        registryFields,
        records,
        serializeRegistryRecordsRowBinary,
        logger,
      );
    },
    async writeAppDeploymentUsage(records: ProcessedAppDeploymentUsageRecord[]) {
      await writeRecords(
        clickhouse,
        agents,
        '"app_deployment_usage"',
        appDeploymentUsageFields,
        records,
        serializeAppDeploymentUsageRowBinary,
        logger,
      );
    },
    async writeOperationErrors(records: ProcessedOperationErrorRecord[]) {
      await writeRecords(
        clickhouse,
        agents,
        'operation_errors',
        operationErrorsFields,
        records,
        serializeOperationErrorsRowBinary,
        logger,
      );
    },
    destroy() {
      httpAgent.destroy();
      httpsAgent.destroy();
    },
  };
}

async function writeRecords<T>(
  config: ClickHouseConfig,
  agents: {
    http: Agent;
    https: Agent.HttpsAgent;
  },
  table: string,
  fields: string,
  records: readonly T[],
  serializeRowBinary: (records: readonly T[]) => Iterable<Buffer>,
  logger: ServiceLogger,
) {
  if (records.length === 0) return;

  const query = `INSERT INTO ${table} (${fields}) FORMAT RowBinary`;
  const compressed = await compressZstdStream(serializeRowBinary(records));

  await writeClickHouse(
    config,
    agents,
    query,
    compressed,
    'application/octet-stream',
    logger,
    3,
  );
}

async function writeClickHouse(
  config: ClickHouseConfig,
  agents: {
    http: Agent;
    https: Agent.HttpsAgent;
  },
  query: string,
  body: Buffer,
  contentType: string,
  logger: ServiceLogger,
  maxRetry: number,
) {
  const stopTimer = writeDuration.startTimer({
    query,
    destination: config.host,
  });
  return got
    .post(`${config.protocol ?? 'https'}://${config.host}:${config.port}`, {
      body,
      searchParams: {
        query,
        async_insert: 1,
        wait_for_async_insert: config.wait_for_async_insert,
        async_insert_busy_timeout_ms: config.async_insert_busy_timeout_ms,
        async_insert_max_data_size: config.async_insert_max_data_size,
        // The adaptive busy timeout ClickHouse enables by default starts at 50ms and only grows when
        // inserts arrive within 50ms of each other; at this insert rate the configured timeout
        // would never apply and every INSERT would become its own part.
        async_insert_use_adaptive_busy_timeout: 0,
      },
      username: config.username,
      password: config.password,
      headers: {
        Accept: 'application/json',
        'Content-Type': contentType,
        'Content-Encoding': 'zstd',
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
        request: 30_000,
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
