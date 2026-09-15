import { Kafka, KafkaMessage, logLevel } from 'kafkajs';
import type { ServiceLogger } from '@hive/service-common';
import { createMskIamTokenProvider } from '@hive/service-common';
import type { RawReport } from '@hive/usage-common';
import { decompress } from '@hive/usage-common';
import type { KafkaEnvironment } from './environment';
import {
  errors,
  ingestedOperationErrorsFailures,
  ingestedOperationErrorsWrites,
  ingestedOperationRegistryFailures,
  ingestedOperationRegistryWrites,
  ingestedOperationsFailures,
  ingestedOperationsWrites,
  poisonPillMessages,
  processDuration,
  reportMessageBytes,
} from './metrics';
import { createProcessor } from './processor';
import { ClickHouseConfig, createWriter } from './writer';

enum Status {
  Waiting = 'Waiting',
  Connected = 'Connected',
  Unhealthy = 'Unhealthy',
  Ready = 'Ready',
  Stopped = 'Stopped',
}

const levelMap = {
  [logLevel.NOTHING]: 'trace',
  [logLevel.ERROR]: 'error',
  [logLevel.WARN]: 'warn',
  [logLevel.INFO]: 'info',
  [logLevel.DEBUG]: 'debug',
} as const;

const retryOnFailureSymbol = Symbol.for('retry-on-failure');

function shouldRetryOnFailure(error: any) {
  return error[retryOnFailureSymbol] === true;
}

export function createIngestor(config: {
  logger: ServiceLogger;
  clickhouse: ClickHouseConfig;
  kafka: {
    topic: string;
    consumerGroup: string;
    concurrency: number;
    connection: KafkaEnvironment['connection'];
  };
}) {
  const { logger } = config;

  const kafka = new Kafka({
    clientId: 'usage-ingestor',
    brokers: config.kafka.connection.broker.split(',').map(b => b.trim()),
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
            : config.kafka.connection.sasl?.mechanism === 'aws-iam'
              ? {
                  mechanism: 'oauthbearer',
                  oauthBearerProvider: createMskIamTokenProvider(
                    config.kafka.connection.sasl.region,
                  ),
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
  });
  const consumer = kafka.consumer({
    groupId: config.kafka.consumerGroup,
    retry: {
      retries: 2,
    },
    // Recommended by Azure EventHub https://docs.microsoft.com/en-us/azure/event-hubs/apache-kafka-configurations
    sessionTimeout: 30_000,
    heartbeatInterval: 3000,
    metadataMaxAge: 180_000,
  });

  async function stop() {
    logger.info('Started Usage Ingestor shutdown...');
    changeStatus(Status.Stopped);
    await consumer.disconnect();
    writer.destroy();
    logger.info(`Consumer disconnected`);

    logger.info('Usage Ingestor stopped');
  }

  consumer.on('consumer.stop', async () => {
    logger.warn('Consumer stopped');
  });

  consumer.on('consumer.crash', async ev => {
    logger.error('Consumer crashed (restart=%s, error=%s)', ev.payload.restart, ev.payload.error);

    changeStatus(Status.Unhealthy);

    if (ev.payload.restart) {
      return;
    }

    logger.info('Restarting consumer...');
    await start();
  });

  consumer.on('consumer.disconnect', async () => {
    logger.warn('Consumer disconnected');
  });

  consumer.on('consumer.fetch', async () => {
    if (status !== Status.Ready) {
      logger.info('Consumer successfully fetched messages after being in status: %s', status);
      changeStatus(Status.Ready);
    }
  });

  async function start() {
    logger.info('Starting Usage Ingestor...');

    changeStatus(Status.Waiting);

    logger.info('Connecting Kafka Consumer');
    logger.debug(`Kafka SASL mechanism: ${config.kafka.connection.sasl?.mechanism ?? 'none'}`);
    await consumer.connect();

    changeStatus(Status.Connected);

    logger.info('Subscribing to Kafka topic: %s', config.kafka.topic);
    await consumer.subscribe({
      topic: config.kafka.topic,
      fromBeginning: true,
    });
    logger.info('Running consumer');
    await consumer.run({
      autoCommit: true,
      autoCommitThreshold: 2,
      partitionsConsumedConcurrently: config.kafka.concurrency,
      eachMessage({ topic, partition, message }) {
        const stopTimer = processDuration.startTimer();
        return processMessage({
          topic,
          partition,
          message,
          logger,
          processor,
          writer,
        })
          .catch(error => {
            errors.inc();
            return Promise.reject(error);
          })
          .finally(() => {
            stopTimer();
          });
      },
    });
    logger.info('Kafka is ready');
    changeStatus(Status.Ready);
  }

  const processor = createProcessor({ logger });
  const writer = createWriter({
    clickhouse: config.clickhouse,
    logger,
  });

  let status: Status = Status.Waiting;

  function changeStatus(newStatus: Status) {
    if (status === newStatus) {
      return;
    }

    logger.info('Changing status to %s', newStatus);
    status = newStatus;
  }

  return {
    readiness() {
      return status === Status.Ready;
    },
    start,
    stop,
  };
}

export async function processMessage({
  processor,
  writer,
  message,
  logger,
  topic,
  partition,
}: {
  processor: ReturnType<typeof createProcessor>;
  writer: ReturnType<typeof createWriter>;
  message: KafkaMessage;
  logger: ServiceLogger;
  topic: string;
  partition: number;
}) {
  reportMessageBytes.observe(message.value!.byteLength);

  let rawReports: RawReport[];
  try {
    // Decompress and parse the message to get a list of reports
    rawReports = JSON.parse((await decompress(message.value!)).toString());
  } catch (error) {
    // A genuinely corrupt/unparseable message is considered a poison
    // pill. It will never successfully decompress or parse no matter how many times
    // it's retried, unlike a write failure below which could be transient.
    poisonPillMessages.inc();
    const summary = {
      topic,
      partition,
      offset: message.offset,
      messageBytes: message.value?.byteLength,
    };
    logger.error(
      { ...summary, error: error instanceof Error ? error.message : String(error) },
      'Report decompression/parsing failed - offset not committed, message will be reprocessed',
    );
    logger.debug(
      { ...summary, value: message.value?.toString('base64') },
      'Poison pill message full payload',
    );
    throw error;
  }

  const { registryRecords, operations, subscriptionOperations, appDeploymentUsageRecords, errors } =
    await processor.processReports(rawReports);

  try {
    // .then and .catch looks weird but async/await with try/catch and Promise.all is even weirder
    await Promise.all([
      writer
        .writeRegistry(registryRecords)
        .then(value => {
          ingestedOperationRegistryWrites.inc(registryRecords.length);
          return Promise.resolve(value);
        })
        .catch(error => {
          ingestedOperationRegistryFailures.inc(registryRecords.length);
          return Promise.reject(error);
        }),
      writer
        .writeOperations(operations)
        .then(value => {
          ingestedOperationsWrites.inc(operations.length);
          return Promise.resolve(value);
        })
        .catch(error => {
          ingestedOperationsFailures.inc(operations.length);
          // We want to retry the kafka message only if the write to operations table fails.
          // Why? Because if we retry the message for operation_registry, we will have duplicate.
          // One write could succeed, the other one could fail.
          // Let's stick to the operations table for now.
          error[retryOnFailureSymbol] = true;
          return Promise.reject(error);
        }),
      writer
        .writeSubscriptionOperations(subscriptionOperations)
        .then(value => {
          ingestedOperationsWrites.inc(subscriptionOperations.length);
          return Promise.resolve(value);
        })
        .catch(error => {
          ingestedOperationsFailures.inc(subscriptionOperations.length);
          // We want to retry the kafka message only if the write to operations table fails.
          // Why? Because if we retry the message for operation_registry, we will have duplicate.
          // One write could succeed, the other one could fail.
          // Let's stick to the operations table for now.
          error[retryOnFailureSymbol] = true;
          return Promise.reject(error);
        }),
      writer.writeAppDeploymentUsage(appDeploymentUsageRecords),
      writer
        .writeOperationErrors(errors)
        .then(value => {
          ingestedOperationErrorsWrites.inc(errors.length);
          return Promise.resolve(value);
        })
        .catch(error => {
          ingestedOperationErrorsFailures.inc(errors.length);
          // error[retryOnFailureSymbol] = true;
          return Promise.reject(error);
        }),
    ]);
  } catch (error) {
    logger.error(error);

    if (shouldRetryOnFailure(error)) {
      poisonPillMessages.inc();
      const summary = {
        topic,
        partition,
        offset: message.offset,
        reportCount: rawReports.length,
        totalOperations: rawReports.reduce((sum, r) => sum + r.size, 0),
        targets: [...new Set(rawReports.map(r => r.target))],
        organizations: [...new Set(rawReports.map(r => r.organization))],
        messageBytes: message.value?.byteLength,
      };
      logger.error(
        summary,
        'Report write failed - offset not committed, message will be reprocessed',
      );
      logger.debug({ ...summary, rawReports }, 'Poison pill message full payload');
      throw error;
    }
  }
}
