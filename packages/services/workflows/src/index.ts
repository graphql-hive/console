import { run } from 'graphile-worker';
import { createPool } from 'slonik';
import { Logger } from '@graphql-hive/logger';
import { registerShutdown, startMetrics } from '@hive/service-common';
import { Context } from './context.js';
import { env } from './environment.js';
import { createEmailProvider } from './lib/emails/providers.js';
import { bridgeFastifyLogger, bridgeGraphileLogger } from './logger.js';
import { createTaskEventEmitter } from './task-events.js';

/**
 * Registered Task Definitions.
 */
const modules = await Promise.all([
  import('./tasks/audit-log-export.js'),
  import('./tasks/email-verification.js'),
  import('./tasks/organization-invitation.js'),
  import('./tasks/organization-ownership-transfer.js'),
  import('./tasks/password-reset.js'),
  import('./tasks/purge-expired-schema-checks.js'),
  import('./tasks/schema-change-notification.js'),
  import('./tasks/usage-rate-limit-exceeded.js'),
  import('./tasks/usage-rate-limit-warning.js'),
]);

const crontab = `
  # Purge expired schema checks every Sunday at 10:00AM
  0 10 * * 0 purgeExpiredSchemaChecks
`;

const pg = await createPool(env.postgres.connectionString);
const logger = new Logger({ level: env.log.level });

logger.info({ pid: process.pid }, 'starting workflow service');

const context: Context = {
  logger,
  email: createEmailProvider(env.email.provider, env.email.emailFrom),
  pg,
  requestBroker: env.requestBroker,
};

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
      if (shutdownMetrics) {
        logger.info('Stopping prometheus endpoint');
        await shutdownMetrics();
        logger.info('Stopping prometheus endpoint successful.');
      }
    } catch (error: unknown) {
      logger.error({ error }, 'Unepected error occured');
      process.exit(1);
    }
  },
});
