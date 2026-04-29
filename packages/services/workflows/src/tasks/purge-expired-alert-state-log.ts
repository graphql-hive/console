import { z } from 'zod';
import { psql } from '@hive/postgres';
import { env } from '../environment.js';
import { defineTask, implementTask } from '../kit.js';

export const PurgeExpiredAlertStateLogTask = defineTask({
  name: 'purgeExpiredAlertStateLog',
  schema: z.unknown(),
});

export const task = implementTask(PurgeExpiredAlertStateLogTask, async args => {
  if (!env.featureFlags.metricAlertRulesEnabled) {
    args.logger.debug('Metric alert rules feature flag disabled, skipping purge');
    return;
  }
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
