import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { purgeExpiredSchemaChecks } from '../lib/expired-schema-checks.js';

export const PurgeExpiredSchemaChecks = defineTask({
  name: 'purgeExpiredSchemaChecks',
  // A cron job's payload carries no `input`; under zod v4 an `unknown` key is still required.
  schema: z.unknown().optional(),
});

export const task = implementTask(PurgeExpiredSchemaChecks, async args => {
  args.logger.debug('purging expired schema checks');
  const statistics = await purgeExpiredSchemaChecks({
    pool: args.context.pg,
    expiresAt: new Date(),
  });
  args.logger.debug({ statistics }, 'finished purging schema checks');
});
