import { z } from 'zod';
import { purgeExpiredSchemaChecks } from '../lib/expired-schema-checks';
import { defineTask, implementTask } from '../postgraphile-kit.js';

export const PurgeExpiredSchemaChecks = defineTask({
  name: 'purgeExpiredSchemaChecks',
  schema: z.undefined(),
});

export const task = implementTask(PurgeExpiredSchemaChecks, async args => {
  await purgeExpiredSchemaChecks({ pool: args.context.pg, expiresAt: new Date() });
});
