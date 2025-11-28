import {
  Logger as GraphileLogger,
  LogLevel as GraphileLogLevel,
  run,
  Runner,
} from 'graphile-worker';
import { createPool } from 'slonik';
import { Logger } from '@graphql-hive/logger';
import { Context } from './context.js';

// TODO: slonik interop
//
const databaseUrl = 'postgresql://postgres:postgres@localhost:5432/registry';

const pool = await createPool(databaseUrl);

const modules = await Promise.all([
  import('./tasks/audit-log-export.js'),
  import('./tasks/email-verification.js'),
  import('./tasks/organization-invite.js'),
  import('./tasks/organization-ownership-transfer.js'),
  import('./tasks/password-reset.js'),
  import('./tasks/schema-change-notification.js'),
  import('./tasks/usage-rate-limit-exceeded.js'),
  import('./tasks/usage-rate-limit-warning.js'),
  import('./workflows/user-onboarding.js'),
]);

const logger = new Logger({ level: 'debug' });

const context: Context = { logger, email: {} };

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
  logger: new GraphileLogger(scope => (level, message, meta) => {
    logger[logLevel(level)](message);
  }),
  crontab: ' ',
  connectionString: databaseUrl,
  taskList: Object.fromEntries(modules.map(module => module.task(context))),
  
});
