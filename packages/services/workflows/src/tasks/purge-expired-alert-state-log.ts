import { z } from 'zod';
import { psql } from '@hive/postgres';
import { defineTask, implementTask } from '../kit.js';

export const PurgeExpiredAlertStateLogTask = defineTask({
  name: 'purgeExpiredAlertStateLog',
  schema: z.unknown(),
});

// No env-var gate: with OR-style enrollment, opted-in orgs accumulate state
// log rows even when the cluster flag is off. The purge needs to run
// unconditionally to keep their tables bounded.
export const task = implementTask(PurgeExpiredAlertStateLogTask, async args => {
  args.logger.debug('purging expired alert state log entries');
  const result = await args.context.pg.oneFirst(psql`
    WITH "deleted" AS (
      DELETE FROM "metric_alert_state_log"
      WHERE "expires_at" < NOW()
      RETURNING 1
    )
    SELECT COUNT(*)::int FROM "deleted";
  `);
  const amount = z.number().parse(result);
  args.logger.debug({ purgedCount: amount }, 'finished purging expired alert state log entries');
});
