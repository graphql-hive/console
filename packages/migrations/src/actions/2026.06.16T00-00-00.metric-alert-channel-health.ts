import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.06.16T00-00-00.metric-alert-channel-health.ts',
  run: ({ psql }) => psql`
-- Per-(rule, channel) record of a dropped delivery: upserted when a channel
-- exhausts its retries for an event, deleted on the next success. A sibling
-- table (not a column on "metric_alert_rule_channels") so it survives that
-- table's DELETE+INSERT churn when a rule's channels are edited.
CREATE TABLE "metric_alert_channel_health" (
  "metric_alert_rule_id" uuid NOT NULL REFERENCES "metric_alert_rules"("id") ON DELETE CASCADE,
  "alert_channel_id"     uuid NOT NULL REFERENCES "alert_channels"("id")    ON DELETE CASCADE,
  "degraded_at"          timestamptz NOT NULL DEFAULT now(),
  "last_error"           text,
  PRIMARY KEY ("metric_alert_rule_id", "alert_channel_id")
);

CREATE INDEX "idx_metric_alert_channel_health_channel" ON "metric_alert_channel_health" ("alert_channel_id"); -- FK-cascade index
`,
} satisfies MigrationExecutor;
