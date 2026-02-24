import { run } from 'graphile-worker';
import { createPubSub } from 'graphql-yoga';
import { createPool } from 'slonik';
import { Logger } from '@graphql-hive/logger';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import { HivePubSub } from '@hive/api/modules/shared/providers/pub-sub';
import { createRedisClient } from '@hive/api/modules/shared/providers/redis';
import {
  createServer,
  registerShutdown,
  reportReadiness,
  sentryInit,
  startHeartbeats,
  startMetrics,
} from '@hive/service-common';
import { Context } from './context.js';
import { env } from './environment.js';
import { createEmailProvider } from './lib/emails/providers.js';
import { schemaProvider } from './lib/schema/provider.js';
import { bridgeFastifyLogger, bridgeGraphileLogger } from './logger.js';
import { createTaskEventEmitter } from './task-events.js';

if (env.sentry) {
  sentryInit({
    dist: 'workflows',
    environment: env.environment,
    dsn: env.sentry.dsn,
    release: env.release,
    enabled: !!env.sentry,
  });
}

/**
 * Registered Task Definitions.
 */
const modules = await Promise.all([
  import('./tasks/audit-log-export.js'),
  import('./tasks/email-verification.js'),
  import('./tasks/organization-invitation.js'),
  import('./tasks/organization-ownership-transfer.js'),
  import('./tasks/password-reset.js'),
  import('./tasks/purge-expired-dedupe-keys.js'),
  import('./tasks/purge-expired-schema-checks.js'),
  import('./tasks/schema-change-notification.js'),
  import('./tasks/usage-rate-limit-exceeded.js'),
  import('./tasks/usage-rate-limit-warning.js'),
  import('./tasks/schema-proposal-composition.js'),
]);

const crontab = `
  # Purge expired schema checks every Sunday at 10:00AM
  0 10 * * 0 purgeExpiredSchemaChecks
  # Every day at 3:00 AM
  0 3 * * * purgeExpiredDedupeKeys
`;

const pg = await createPool(env.postgres.connectionString);
const logger = new Logger({ level: env.log.level });

logger.info({ pid: process.pid }, 'starting workflow service');

const stopHttpHeartbeat = env.httpHeartbeat
  ? startHeartbeats({
      enabled: true,
      endpoint: env.httpHeartbeat.endpoint,
      intervalInMS: 20_000,
      onError: error => logger.error({ error }, 'Heartbeat failed.'),
      isReady: () => true,
    })
  : null;

const server = await createServer({
  sentryErrorHandler: !!env.sentry,
  name: 'workflows',
  log: logger,
});

const redis = createRedisClient('Redis', env.redis, server.log.child({ source: 'Redis' }));

const pubSub = createPubSub({
  eventTarget: createRedisEventTarget({
    publishClient: redis,
    subscribeClient: createRedisClient(
      'subscriber',
      env.redis,
      server.log.child({ source: 'RedisSubscribe' }),
    ),
  }),
}) as HivePubSub;

const context: Context = {
  logger,
  email: createEmailProvider(env.email.provider, env.email.emailFrom),
  pg,
  requestBroker: env.requestBroker,
  schema: schemaProvider({
    logger,
    schemaServiceUrl: env.schema.serviceUrl,
  }),
  pubSub,
};

server.route({
  method: ['GET', 'HEAD'],
  url: '/_health',
  handler(_req, res) {
    void res.status(200).send();
  },
});

server.route({
  method: ['GET', 'HEAD'],
  url: '/_readiness',
  handler(_, res) {
    reportReadiness(true);
    void res.status(200).send();
  },
});

if (context.email.id === 'mock') {
  server.route({
    method: ['GET'],
    url: '/_history',
    handler(_, res) {
      void res.status(200).send(context.email.history);
    },
  });
}

await server.listen({
  port: env.http.port,
  host: '::',
});

const shutdownMetrics = env.prometheus
  ? await startMetrics(env.prometheus.labels.instance, env.prometheus.port)
  : null;

const runner = await run({
  logger: bridgeGraphileLogger(logger),
  crontab,
  pgPool: pg.pool,
  taskList: Object.fromEntries(modules.map(module => module.task(context))),
  noHandleSignals: true,
  events: createTaskEventEmitter(),
  noPreparedStatements: true,
});

registerShutdown({
  logger: bridgeFastifyLogger(logger),
  async onShutdown() {
    try {
      logger.info('Stopping task runner.');
      await runner.stop();
      logger.info('Task runner shutdown successful.');
      logger.info('Shutdown postgres connection.');
      await pg.end();
      logger.info('Shutdown postgres connection successful.');
      logger.info('Shutdown redis connection.');
      redis.disconnect(false);
      if (shutdownMetrics) {
        logger.info('Stopping prometheus endpoint');
        await shutdownMetrics();
        logger.info('Stopping prometheus endpoint successful.');
      }
      if (stopHttpHeartbeat) {
        logger.info('Stop HTTP heartbeat');
        stopHttpHeartbeat();
        logger.info('HTTP heartbeat stopped');
      }
      logger.info('Stopping HTTP server');
      await server.close();
      logger.info('HTTP server stopped');
    } catch (error: unknown) {
      logger.error({ error }, 'Unexpected error occurred');
      process.exit(1);
    }
  },
});
