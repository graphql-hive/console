import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.06.05T00-00-00.metric-alert-filter-shared-only.ts',
  run: ({ psql }) => [
    {
      name: 'metric_alert_rules.saved_filter_id FK -> ON DELETE NO ACTION',
      // NO ACTION (not RESTRICT): both error on a *direct* delete of an in-use
      // filter, but NO ACTION's check is deferred to end-of-statement,
      // so a project delete (which cascades to BOTH metric_alert_rules and
      // saved_filters via project_id) still succeeds: the referencing rules
      // are gone by the time the check runs. RESTRICT is non-deferrable and would
      // abort that cascade.
      query: psql`
        ALTER TABLE "metric_alert_rules"
          DROP CONSTRAINT IF EXISTS "metric_alert_rules_saved_filter_id_fkey"
          , ADD CONSTRAINT "metric_alert_rules_saved_filter_id_fkey"
            FOREIGN KEY ("saved_filter_id")
            REFERENCES "saved_filters"("id")
            ON DELETE NO ACTION
      `,
    },
  ],
} satisfies MigrationExecutor;
