import { createHash } from 'node:crypto';
import { Kafka, KafkaMessage, logLevel } from 'kafkajs';
import type { ServiceLogger } from '@hive/service-common';
import { createMskIamTokenProvider } from '@hive/service-common';
import type { RawReport } from '@hive/usage-common';
import { decompress } from '@hive/usage-common';
import type { KafkaEnvironment } from './environment';
import { createInflightTracker } from './inflight';
import { errors, poisonPillMessages, processDuration, reportMessageBytes } from './metrics';
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

export function createIngestor(config: {
  logger: ServiceLogger;
  clickhouse: ClickHouseConfig;
  inflight: {
    maxBytes: number;
    commitIntervalMs?: number;
    shutdownDeadlineMs?: number;
  };
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

  const tracker = createInflightTracker({
    maxBytes: config.inflight.maxBytes,
    commitIntervalMs: config.inflight.commitIntervalMs ?? 1_000,
    logger,
    onCommit: offsets => consumer.commitOffsets(offsets),
  });

  consumer.on('consumer.end_batch_process', event => {
    tracker.observeHighWatermark(
      event.payload.topic,
      event.payload.partition,
      event.payload.highWatermark,
    );
  });

  consumer.on('consumer.group_join', event => {
    tracker.retainPartitions(event.payload.memberAssignment);
  });

  async function stop() {
    logger.info('Started Usage Ingestor shutdown...');
    changeStatus(Status.Stopped);

    try {
      consumer.pause([{ topic: config.kafka.topic }]);
    } catch (error) {
      logger.debug(
        { error: error instanceof Error ? error.message : String(error) },
        'Consumer was not running, nothing to pause',
      );
    }

    const { remaining } = await tracker.drain(config.inflight.shutdownDeadlineMs ?? 30_000);
    writer.destroy();
    await consumer.disconnect();
    logger.info({ unacknowledgedMessages: remaining }, 'Consumer disconnected');

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
      // Offsets are committed by the in-flight tracker once ClickHouse has acknowledged
      // every write for a message, never on consumption.
      autoCommit: false,
      partitionsConsumedConcurrently: config.kafka.concurrency,
      eachMessage({ topic, partition, message, heartbeat }) {
        const stopTimer = processDuration.startTimer();
        return processMessage({
          topic,
          partition,
          message,
          heartbeat,
          logger,
          processor,
          writer,
          tracker,
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

function serializedBytes(rows: string[]) {
  return rows.reduce((sum, row) => sum + row.length, 0);
}

/**
 * Parses one Kafka message and starts its ClickHouse writes. Resolves as soon as the writes
 * are handed to the in-flight tracker; the tracker commits the offset when they are all
 * acknowledged. Rejects only for a message that cannot be parsed.
 *
 * The deduplication token is a hash of the report ids in the message, hashed so it stays a
 * fixed size in the query string however many reports a message carries. Today the usage
 * service assigns those ids, so the token identifies the produced message; once clients
 * supply their own ids it will identify the reports themselves.
 */
export async function processMessage({
  processor,
  writer,
  tracker,
  message,
  heartbeat,
  logger,
  topic,
  partition,
}: {
  processor: ReturnType<typeof createProcessor>;
  writer: ReturnType<typeof createWriter>;
  tracker: Pick<ReturnType<typeof createInflightTracker>, 'track' | 'waitForCapacity'>;
  message: KafkaMessage;
  heartbeat: () => Promise<void>;
  logger: ServiceLogger;
  topic: string;
  partition: number;
}) {
  reportMessageBytes.observe(message.value!.byteLength);
  const source = `${topic}/${partition}@${message.offset}`;

  let rawReports: RawReport[];
  try {
    // Decompress and parse the message to get a list of reports
    rawReports = JSON.parse((await decompress(message.value!)).toString());
  } catch (error) {
    // A genuinely corrupt/unparseable message is considered a poison
    // pill. It will never successfully decompress or parse no matter how many times
    // it's retried, unlike a write failure which could be transient.
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

  const deduplicationToken = createHash('sha256')
    .update(rawReports.map(report => report.id).join(','))
    .digest('hex');

  const {
    registryRecords,
    operations,
    subscriptionOperations,
    appDeploymentUsageRecords,
    errors: errorRecords,
  } = await processor.processReports(rawReports);

  const bytes =
    serializedBytes(registryRecords) +
    serializedBytes(operations) +
    serializedBytes(subscriptionOperations) +
    serializedBytes(appDeploymentUsageRecords) +
    serializedBytes(errorRecords);

  await tracker.waitForCapacity(bytes, heartbeat);

  const options = { deduplicationToken, source };
  const written = Promise.all([
    writer.writeRegistry(registryRecords, options),
    writer.writeOperations(operations, options),
    writer.writeSubscriptionOperations(subscriptionOperations, options),
    writer.writeAppDeploymentUsage(appDeploymentUsageRecords, options),
    writer.writeOperationErrors(errorRecords, options),
  ]);

  tracker.track({
    topic,
    partition,
    offset: message.offset,
    bytes,
    promise: written,
  });
}
