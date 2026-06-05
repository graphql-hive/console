import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.06.05T00-00-00.metric-alert-filter-shared-only.ts',
  run: ({ psql }) => [
    {
      name: 'detach alert rules that reference private saved filters',
      query: psql`
        UPDATE "metric_alert_rules"
        SET "saved_filter_id" = NULL
        WHERE "saved_filter_id" IN (
          SELECT "id" FROM "saved_filters" WHERE "visibility" = 'private'
        )
      `,
    },
    {
      name: 'metric_alert_rules.saved_filter_id FK -> ON DELETE RESTRICT',
      query: psql`
        ALTER TABLE "metric_alert_rules"
          DROP CONSTRAINT IF EXISTS "metric_alert_rules_saved_filter_id_fkey"
          , ADD CONSTRAINT "metric_alert_rules_saved_filter_id_fkey"
            FOREIGN KEY ("saved_filter_id")
            REFERENCES "saved_filters"("id")
            ON DELETE RESTRICT
      `,
    },
  ],
} satisfies MigrationExecutor;
