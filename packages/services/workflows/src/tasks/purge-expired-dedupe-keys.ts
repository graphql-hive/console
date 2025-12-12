import { sql } from 'slonik';
import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';

export const PurgeExpiredDedupeKeysTask = defineTask({
  name: 'purgeExpiredDedupeKeys',
  schema: z.unknown(),
});

export const task = implementTask(PurgeExpiredDedupeKeysTask, async args => {
  args.logger.debug('purging expired postgraphile task dedupe keys');
  const result = await args.context.pg.oneFirst(sql`
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
