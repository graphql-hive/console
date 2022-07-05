import * as Sentry from '@sentry/node';
import { Queue, QueueScheduler, Worker, Job } from 'bullmq';
import Redis, { Redis as RedisInstance } from 'ioredis';
import pTimeout from 'p-timeout';
import type { Config } from './types';
import { scheduleWebhook, createWebhookJob } from './jobs';

export interface WebhookInput {
  endpoint: string;
  event: {
    organization: {
      id: string;
      cleanId: string;
      name: string;
    };
    project: {
      id: string;
      cleanId: string;
      name: string;
    };
    target: {
      id: string;
      cleanId: string;
      name: string;
    };
    schema: {
      id: string;
      valid: boolean;
      commit: string;
    };
    changes: any[];
    errors: any[];
  };
}

export function createScheduler(config: Config) {
  let redisConnection: RedisInstance | null;
  let webhookQueue: Queue | null;
  let webhookQueueScheduler: QueueScheduler | null;
  let stopped = false;
  const logger = config.logger;

  async function clearBull() {
    logger.info('Clearing BullMQ...');

    try {
      webhookQueue?.removeAllListeners();
      webhookQueueScheduler?.removeAllListeners(),
        await pTimeout(
          Promise.all([webhookQueue?.close(), webhookQueueScheduler?.close()]),
          5000,
          'BullMQ close timeout'
        );
    } catch (e) {
      logger.error('Failed to stop queues', e);
    } finally {
      webhookQueue = null;
      webhookQueueScheduler = null;
      logger.info('BullMQ stopped');
    }
  }

  async function initQueueAndWorkers() {
    if (!redisConnection) {
      return;
    }

    const prefix = 'hive-webhooks';

    webhookQueueScheduler = new QueueScheduler(config.webhookQueueName, {
      prefix,
      connection: redisConnection,
      sharedConnection: true,
    });

    webhookQueue = new Queue(config.webhookQueueName, {
      prefix,
      connection: redisConnection,
      sharedConnection: true,
    });

    // Wait for Queues and Scheduler to be ready
    await Promise.all([webhookQueueScheduler.waitUntilReady(), webhookQueue.waitUntilReady()]);

    const webhookJob = createWebhookJob({ config });

    const webhookWorker = new Worker<WebhookInput>(config.webhookQueueName, webhookJob, {
      prefix,
      connection: redisConnection,
      sharedConnection: true,
    });

    webhookWorker.on('error', onError('webhookWorker'));
    webhookWorker.on('failed', onFailed);

    // Wait for Workers
    await webhookWorker.waitUntilReady();
  }

  async function start() {
    redisConnection = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy(times) {
        return Math.min(times * 500, 2000);
      },
      reconnectOnError(error) {
        onError('redis:reconnectOnError')(error);
        return 1;
      },
      db: 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisConnection.on('error', err => {
      onError('redis:error')(err);
    });

    redisConnection.on('connect', () => {
      logger.info('Redis connection established');
    });

    redisConnection.on('ready', async () => {
      logger.info('Redis connection ready... creating queues and workers...');
      await initQueueAndWorkers();
    });

    redisConnection.on('close', () => {
      logger.info('Redis connection closed');
    });

    redisConnection.on('reconnecting', timeToReconnect => {
      logger.info('Redis reconnecting in %s', timeToReconnect);
    });

    redisConnection.on('end', async () => {
      logger.info('Redis ended - no more reconnections will be made');
      await stop();
    });
  }

  function onError(source: string) {
    return (error: Error) => {
      logger.error(`onError called from source ${source}`, error);
      Sentry.captureException(error, {
        extra: {
          error,
          source,
        },
        level: 'error',
      });
    };
  }

  function onFailed(job: Job, error: Error) {
    logger.debug(`Job %s failed after %s attempts, reason: %s`, job.name, job.attemptsMade, job.failedReason);
    logger.error(error);
  }

  async function stop() {
    logger.info('Started Usage shutdown...');

    stopped = true;

    await clearBull();

    if (redisConnection) {
      logger.info('Stopping Redis...');

      try {
        redisConnection.disconnect(false);
      } catch (e) {
        logger.error('Failed to stop Redis connection', e);
      } finally {
        redisConnection = null;
        webhookQueue = null;
        logger.info('Redis stopped');
      }
    }

    logger.info('Existing');
    process.exit(0);
  }

  async function schedule(webhook: WebhookInput) {
    return scheduleWebhook({ queue: webhookQueue!, webhook, config });
  }

  return {
    schedule,
    start,
    stop,
    readiness() {
      if (stopped) {
        return false;
      }

      return webhookQueue !== null && redisConnection !== null && redisConnection?.status === 'ready';
    },
  };
}
