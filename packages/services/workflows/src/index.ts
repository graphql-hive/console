import { OpenWorkflow } from 'openworkflow';
import { BackendPostgres } from '@openworkflow/backend-postgres';
import { Context } from './context.js';

const databaseUrl = 'postgresql://postgres:postgres@localhost:5432/postgres';

const backend = await BackendPostgres.connect(databaseUrl);
const ow = new OpenWorkflow({ backend });

const context: Context = {
  email: {}, // TODO
  logger: {}, // TODO
};

const modules = await Promise.all([
  import('./workflows/audit-log-export.js'),
  import('./workflows/email-verification.js'),
  import('./workflows/organization-invite.js'),
  import('./workflows/organization-ownership-transfer.js'),
  import('./workflows/password-reset.js'),
  import('./workflows/schema-change-notification.js'),
  import('./workflows/usage-rate-limit-exceeded.js'),
  import('./workflows/usage-rate-limit-warning.js'),
]);

for (const module of modules) {
  module.register(ow, context);
}

ow.newWorker({
  concurrency: 4,
}).start();

/////////// SCRATCH PAD
