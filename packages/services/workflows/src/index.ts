import {
  Logger as GraphileLogger,
  LogLevel as GraphileLogLevel,
  run,
  Runner,
} from 'graphile-worker';
import { createPool } from 'slonik';
import { Logger } from '@graphql-hive/logger';
import { Context } from './context.js';
import { env } from './environment.js';
import { createEmailProvider } from './lib/emails/providers.js';

const pg = await createPool(env.postgres.connectionString);

const modules = await Promise.all([
  import('./tasks/audit-log-export.js'),
  import('./tasks/email-verification.js'),
  import('./tasks/organization-invite.js'),
  import('./tasks/organization-ownership-transfer.js'),
  import('./tasks/password-reset.js'),
  import('./tasks/schema-change-notification.js'),
  import('./tasks/usage-rate-limit-exceeded.js'),
  import('./tasks/usage-rate-limit-warning.js'),
]);

const logger = new Logger({ level: env.log.level });

const context: Context = {
  logger,
  email: createEmailProvider(env.email.provider, env.email.emailFrom),
  pg,
};

function logLevel(level: GraphileLogLevel) {
  switch (level) {
    case 'warning':
      return 'warn' as const;
    case 'info': {
      return 'info' as const;
    }
    case 'debug': {
      return 'debug' as const;
    }
    case 'error': {
      return 'error' as const;
    }
  }
  throw new Error('nooop');
}

let runner: Runner = await run({
  logger: new GraphileLogger(_scope => (level, message, _meta) => {
    logger[logLevel(level)](message);
  }),
  // TODO: define cron jobs!
  crontab: ' ',
  connectionString: env.postgres.connectionString,
  taskList: Object.fromEntries(modules.map(module => module.task(context))),
});

process.on('SIGINT', () => {
  logger.info('Received shutdown signal. Stopping runner.');
  runner.stop().then(() => {
    logger.info('Runner shutdown successful.');
  });
});
