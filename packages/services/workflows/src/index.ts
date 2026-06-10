import { run } from 'graphile-worker';
import { Logger } from '@graphql-hive/logger';
import { createPostgresDatabasePool } from '@hive/postgres';
import { bridgeGraphileLogger, createHivePubSub } from '@hive/pubsub';
import {
  configureTracing,
  createRedisClient,
  createServer,
  registerShutdown,
  reportReadiness,
  sentryInit,
  startHeartbeats,
  startMetrics,
  type TracingInstance,
} from '@hive/service-common';
import { Context } from './context.js';
import { env } from './environment.js';
import { ClickHouseClient } from './lib/clickhouse-client.js';
import { createEmailProvider } from './lib/emails/providers.js';
import { schemaProvider } from './lib/schema/provider.js';
import { bridgeFastifyLogger } from './logger.js';
import { createTaskEventEmitter } from './task-events.js';

let tracing: TracingInstance | undefined;
if (env.tracing.enabled) {
  tracing = configureTracing({
    collectorEndpoint: env.tracing.collectorEndpoint,
    serviceName: 'workflows',
  });
  tracing.instrumentNodeFetch();
  tracing.setup();
}

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
  import('./tasks/evaluate-metric-alert-rules.js'),
  import('./tasks/send-metric-alert-channel-notification.js'),
  import('./tasks/purge-expired-alert-state-log.js'),
]);

const pg = await createPostgresDatabasePool({
  connectionParameters: env.postgres.connectionString,
  additionalInterceptors: tracing ? [tracing.instrumentSlonik()] : [],
});
const logger = new Logger({ level: env.log.level });

logger.info({ pid: process.pid }, 'starting workflow service ' + process.pid);

// Build the crontab. The metric-alerts evaluator queries ClickHouse for
// metric windows, so its line is only included when ClickHouse is
// configured. Otherwise the task would silently bail every minute. The
// state-log purge task only touches Postgres so it stays unconditional.
const crontabLines: string[] = [
  '# Purge expired schema checks every Sunday at 10:00AM',
  '0 10 * * 0 purgeExpiredSchemaChecks',
  '# Every day at 3:00 AM',
  '0 3 * * * purgeExpiredDedupeKeys',
];
if (env.clickhouse) {
  crontabLines.push(
    '# Evaluate metric alert rules every minute',
    '* * * * * evaluateMetricAlertRules',
  );
} else {
  logger.warn(
    'ClickHouse not configured — metric alert rules will not be evaluated. ' +
      'Set CLICKHOUSE=1 and the CLICKHOUSE_* env vars to enable.',
  );
}
crontabLines.push(
  '# Purge expired alert state log entries daily at 4:00 AM',
  '0 4 * * * purgeExpiredAlertStateLog',
);
const crontab = crontabLines.join('\n');

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

const redis = await createRedisClient(env.redis, {
  logger: server.log.child({ source: 'Redis' }),
});

const redisSubscriber = await createRedisClient(env.redis, {
  logger: server.log.child({ source: 'RedisSubscribe' }),
});

const pubSub = createHivePubSub({
  publisher: redis,
  subscriber: redisSubscriber,
});

const clickhouse = env.clickhouse
  ? new ClickHouseClient(env.clickhouse, logger.child({ source: 'ClickHouse' }))
  : null;

const context: Context = {
  logger,
  email: createEmailProvider(env.email.provider, env.email.emailFrom),
  pg,
  clickhouse,
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
    handler(req, res) {
      const query = new URLSearchParams(req.query as any);
      const after = query.get('after');
      if (after) {
        return void res
          .status(200)
          .send(context.email.history.filter(h => h.date > new Date(after)));
      }
      void res.status(200).send(context.email.history);
    },
  });
}

await server.listen({
  port: env.http.port,
  host: env.http.host,
  ipv6Only: env.http.ipv6Only,
});

const shutdownMetrics = env.prometheus
  ? await startMetrics(env.prometheus.labels.instance, {
      port: env.prometheus.port,
      host: env.http.host,
      ipv6Only: env.http.ipv6Only,
    })
  : null;

const runner = await run({
  logger: bridgeGraphileLogger(logger),
  crontab,
  pgPool: pg.getPgPoolCompat(),
  taskList: Object.fromEntries(modules.map(module => module.task(context))),
  noHandleSignals: true,
  events: createTaskEventEmitter(),
  noPreparedStatements: true,
});

registerShutdown({
  logger: bridgeFastifyLogger(logger),
  async onShutdown() {
    try {
      if (tracing) {
        logger.info('Flushing tracing spans.');
        await tracing.shutdown();
      }
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
