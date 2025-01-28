import { CompressionTypes, Kafka, logLevel, Partitioners, RetryOptions } from 'kafkajs';
import { traceInlineSync, type ServiceLogger } from '@hive/service-common';
import type { RawOperationMap, RawReport } from '@hive/usage-common';
import { compress } from '@hive/usage-common';
import * as Sentry from '@sentry/node';
import { calculateChunkSize, createKVBuffer } from './buffer';
import type { KafkaEnvironment } from './environment';
import { createFallbackQueue } from './fallback-queue';
import {
  bufferFlushes,
  compressDuration,
  estimationError,
  kafkaDuration,
  rawOperationFailures,
  rawOperationWrites,
} from './metrics';

enum Status {
  Waiting = 'Waiting',
  Ready = 'Ready',
  Unhealthy = 'Unhealthy',
  Stopped = 'Stopped',
}

const levelMap = {
  [logLevel.NOTHING]: 'trace',
  [logLevel.ERROR]: 'error',
  [logLevel.WARN]: 'warn',
  [logLevel.INFO]: 'info',
  [logLevel.DEBUG]: 'debug',
} as const;

const retryOptions = {
  maxRetryTime: 30_000,
  initialRetryTime: 500,
  factor: 0.2,
  multiplier: 2,
  retries: 10,
} satisfies RetryOptions; // why satisfies? To be able to use `retryOptions.retries` and get `number` instead of `number | undefined`

export function splitReport(report: RawReport, numOfChunks: number) {
  const reports: RawReport[] = [];
  const operationMapLength = Object.keys(report.map).length;

  const keyReportIndexMap: {
    [operationMapKey: string]: number;
  } = {};
  const operationMapEntries = Object.entries(report.map);
  let endedAt = 0;
  for (let chunkIndex = 0; chunkIndex < numOfChunks; chunkIndex++) {
    const chunkSize = calculateChunkSize(operationMapLength, numOfChunks, chunkIndex);
    const start = endedAt;
    const end = start + chunkSize;
    endedAt = end;
    const chunk = operationMapEntries.slice(start, end);

    const operationMap: RawOperationMap = {};
    for (const [key, record] of chunk) {
      keyReportIndexMap[key] = chunkIndex;
      operationMap[key] = record;
    }

    reports.push({
      id: `${report.id}--chunk-${chunkIndex}`,
      size: 0,
      target: report.target,
      organization: report.organization,
      map: operationMap,
      operations: [],
    });
  }

  for (const op of report.operations) {
    const chunkIndex = keyReportIndexMap[op.operationMapKey];
    reports[chunkIndex].operations.push(op);
    reports[chunkIndex].size += 1;
  }

  return reports;
}

export function createUsage(config: {
  logger: ServiceLogger;
  kafka: {
    topic: string;
    buffer: {
      /**
       * The maximum number of operations to buffer before flushing to Kafka.
       */
      size: number;
      /**
       * In milliseconds
       */
      interval: number;
      /**
       * Use smart estimator to estimate the buffer limit
       */
      dynamic: boolean;
    };
    connection: KafkaEnvironment['connection'];
  };
  onStop(reason: string): Promise<void>;
}) {
  const { logger } = config;

  const kafka = new Kafka({
    clientId: 'usage',
    brokers: [config.kafka.connection.broker],
    ssl: config.kafka.connection.ssl,
    sasl:
      config.kafka.connection.sasl?.mechanism === 'plain'
        ? {
            mechanism: 'plain',
            username: config.kafka.connection.sasl.username,
            password: config.kafka.connection.sasl.password,
          }
        : config.kafka.connection.sasl?.mechanism === 'scram-sha-256'
          ? {
              mechanism: 'scram-sha-256',
              username: config.kafka.connection.sasl.username,
              password: config.kafka.connection.sasl.password,
            }
          : config.kafka.connection.sasl?.mechanism === 'scram-sha-512'
            ? {
                mechanism: 'scram-sha-512',
                username: config.kafka.connection.sasl.username,
                password: config.kafka.connection.sasl.password,
              }
            : undefined,
    logLevel: logLevel.INFO,
    logCreator() {
      return entry => {
        logger[levelMap[entry.level]]({
          ...entry.log,
          message: undefined,
          timestamp: undefined,
          msg: `[${entry.namespace}] ${entry.log.message}`,
          time: new Date(entry.log.timestamp).getTime(),
        });
      };
    },
    // settings recommended by Azure EventHub https://docs.microsoft.com/en-us/azure/event-hubs/apache-kafka-configurations
    requestTimeout: 60_000, //
    connectionTimeout: 5_000,
    authenticationTimeout: 5_000,
    retry: retryOptions,
  });

  const producer = kafka.producer({
    // settings recommended by Azure EventHub https://docs.microsoft.com/en-us/azure/event-hubs/apache-kafka-configurations
    metadataMaxAge: 180_000,
    createPartitioner: Partitioners.LegacyPartitioner,
    retry: retryOptions,
  });
  const buffer = createKVBuffer<RawReport>({
    logger,
    size: config.kafka.buffer.size,
    interval: config.kafka.buffer.interval,
    limitInBytes: 990_000, // 1MB is the limit of a single request to EventHub, let's keep it below that
    useEstimator: config.kafka.buffer.dynamic,
    isTooLargePayloadError(error) {
      return error instanceof Error && 'type' in error && error.type === 'MESSAGE_TOO_LARGE';
    },
    calculateReportSize(report) {
      return Object.keys(report.map).length;
    },
    split(report, numOfChunks) {
      logger.info('Splitting into %s', numOfChunks);
      return splitReport(report, numOfChunks);
    },
    onRetry(reports) {
      // Because we do a retry, we need to decrease the number of failures
      const numOfOperations = reports.reduce((sum, report) => report.size + sum, 0);
      rawOperationFailures.dec(numOfOperations);
    },
    async sender(reports, estimatedSizeInBytes, batchId, validateSize) {
      const numOfOperations = reports.reduce((sum, report) => report.size + sum, 0);
      const compressLatencyStop = compressDuration.startTimer();
      const value = await compress(JSON.stringify(reports)).finally(() => {
        compressLatencyStop();
      });
      estimationError.observe(Math.abs(estimatedSizeInBytes - value.byteLength) / value.byteLength);

      validateSize(value.byteLength); // this will throw if the size is too big

      try {
        bufferFlushes.inc();
        const stopTimer = kafkaDuration.startTimer();
        const meta = await producer
          .send({
            topic: config.kafka.topic,
            compression: CompressionTypes.None, // Event Hubs doesn't support compression
            messages: [
              {
                value,
              },
            ],
          })
          .finally(() => {
            stopTimer();
          });
        if (meta[0].errorCode) {
          rawOperationFailures.inc(numOfOperations);
          logger.error(`Failed to flush (id=%s, errorCode=%s)`, batchId, meta[0].errorCode);
          Sentry.setTags({
            batchId,
            errorCode: meta[0].errorCode,
            numOfOperations,
          });
          Sentry.captureException(new Error(`Failed to flush usage reports to Kafka`));
        } else {
          rawOperationWrites.inc(numOfOperations);
          logger.info(`Flushed (id=%s, operations=%s)`, batchId, numOfOperations);
        }

        changeStatus(Status.Ready);
      } catch (error: any) {
        rawOperationFailures.inc(numOfOperations);

        changeStatus(Status.Unhealthy);
        logger.error(`Failed to flush (id=%s, error=%s)`, batchId, error.message);
        Sentry.setTags({
          batchId,
          message: error.message,
          numOfOperations,
        });
        Sentry.captureException(error);

        logger.info('Adding to fallback queue (id=%s)', batchId);
        fallback.add(value, numOfOperations);

        throw error;
      }
    },
  });

  const fallback = createFallbackQueue({
    async send(value, numOfOperations) {
      bufferFlushes.inc();
      const stopTimer = kafkaDuration.startTimer();
      try {
        await producer.send({
          topic: config.kafka.topic,
          compression: CompressionTypes.None,
          messages: [
            {
              value,
            },
          ],
        });
        rawOperationWrites.inc(numOfOperations);
      } catch (error) {
        rawOperationFailures.inc(numOfOperations);
        throw error;
      } finally {
        stopTimer();
      }
    },
    logger: logger.child({ namespace: 'fallback' }),
  });

  let status: Status = Status.Waiting;
  function changeStatus(newStatus: Status) {
    if (status === newStatus) {
      return;
    }

    logger.info('Changing status to %s', newStatus);
    status = newStatus;
  }

  producer.on(producer.events.REQUEST_TIMEOUT, () => {
    logger.info('Kafka producer: request timeout');
  });

  async function stop() {
    logger.info('Started Usage shutdown...');

    changeStatus(Status.Stopped);
    await buffer.stop();
    logger.info(`Buffering stopped`);
    await fallback.stop();
    logger.info(`Fallback stopped`);
    await producer.disconnect();
    logger.info(`Producer disconnected`);

    logger.info('Usage stopped');
  }

  return {
    collect: traceInlineSync(
      'collect',
      {
        initAttributes: report => ({
          'hive.service.ready': status == Status.Ready,
          'hive.input.report.id': report.id,
          'hive.input.report.size': Object.keys(report.map).length,
        }),
      },
      (report: RawReport) => {
        if (status !== Status.Ready) {
          throw new Error('Usage is not ready yet');
        }

        buffer.add(report);
      },
    ),
    readiness() {
      return status === Status.Ready && fallback.size() === 0;
    },
    async start() {
      logger.info('Starting Kafka producer');
      await producer.connect();
      buffer.start();
      changeStatus(Status.Ready);
      logger.info('Kafka producer is ready');
      fallback.start();
    },
    stop,
  };
}
