import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { purgeExpiredSchemaChecks } from '../lib/expired-schema-checks';

export const PurgeExpiredSchemaChecks = defineTask({
  name: 'purgeExpiredSchemaChecks',
  schema: z.undefined(),
});

export const task = implementTask(PurgeExpiredSchemaChecks, async args => {
  await purgeExpiredSchemaChecks({ pool: args.context.pg, expiresAt: new Date() });
});
