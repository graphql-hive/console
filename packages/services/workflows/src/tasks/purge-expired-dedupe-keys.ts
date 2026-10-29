import { z } from 'zod';
import { psql } from '@hive/postgres';
import { defineTask, implementTask } from '../kit.js';

export const PurgeExpiredDedupeKeysTask = defineTask({
  name: 'purgeExpiredDedupeKeys',
  // A cron job's payload carries no `input`; under zod v4 an `unknown` key is still required.
  schema: z.unknown().optional(),
});

export const task = implementTask(PurgeExpiredDedupeKeysTask, async args => {
  args.logger.debug('purging expired postgraphile task dedupe keys');
  const result = await args.context.pg.oneFirst(psql`
      WITH "deleted" AS (
        DELETE FROM "graphile_worker_deduplication"
        WHERE "expires_at" < NOW()
        RETURNING 1
      )
      SELECT COUNT(*) FROM "deleted";
  `);
  const amount = z.number().parse(result);
  args.logger.debug(
    { purgedCount: amount },
    'finished purging expired postgraphile task dedupe keys',
  );
});
