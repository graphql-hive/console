import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.04.15T00-00-01.metric-alert-rules.ts',
  run: ({ psql }) => psql`
CREATE TYPE "metric_alert_type" AS ENUM ('LATENCY', 'ERROR_RATE', 'TRAFFIC');
CREATE TYPE "metric_alert_metric" AS ENUM ('AVG', 'P75', 'P90', 'P95', 'P99');
CREATE TYPE "metric_alert_threshold_type" AS ENUM ('FIXED_VALUE', 'PERCENTAGE_CHANGE');
CREATE TYPE "metric_alert_direction" AS ENUM ('ABOVE', 'BELOW');
CREATE TYPE "metric_alert_severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "metric_alert_state" AS ENUM ('NORMAL', 'PENDING', 'FIRING', 'RECOVERING');

CREATE TABLE "metric_alert_rules" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "target_id" uuid NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "type" "metric_alert_type" NOT NULL,
  "time_window_minutes" integer NOT NULL DEFAULT 30,
  "metric" "metric_alert_metric",
  "threshold_type" "metric_alert_threshold_type" NOT NULL,
  "threshold_value" double precision NOT NULL,
  "direction" "metric_alert_direction" NOT NULL DEFAULT 'ABOVE',
  "severity" "metric_alert_severity" NOT NULL DEFAULT 'WARNING',
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "enabled" boolean NOT NULL DEFAULT true,
  "last_evaluated_at" timestamptz,
  "last_triggered_at" timestamptz,
  "state" "metric_alert_state" NOT NULL DEFAULT 'NORMAL',
  "state_changed_at" timestamptz,
  "confirmation_minutes" integer NOT NULL DEFAULT 0,
  "saved_filter_id" uuid REFERENCES "saved_filters"("id") ON DELETE SET NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "metric_alert_rules_metric_required" CHECK (
    ("type" = 'LATENCY' AND "metric" IS NOT NULL) OR ("type" != 'LATENCY' AND "metric" IS NULL)
  )
);

CREATE INDEX "idx_metric_alert_rules_enabled" ON "metric_alert_rules" ("enabled") WHERE "enabled" = true;

CREATE TABLE "metric_alert_rule_channels" (
  "metric_alert_rule_id" uuid NOT NULL REFERENCES "metric_alert_rules"("id") ON DELETE CASCADE,
  "alert_channel_id" uuid NOT NULL REFERENCES "alert_channels"("id") ON DELETE CASCADE,
  PRIMARY KEY ("metric_alert_rule_id", "alert_channel_id")
);

CREATE INDEX "idx_metric_alert_rule_channels_channel" ON "metric_alert_rule_channels" ("alert_channel_id");

CREATE TABLE "metric_alert_incidents" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "metric_alert_rule_id" uuid NOT NULL REFERENCES "metric_alert_rules"("id") ON DELETE CASCADE,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz,
  "current_value" double precision NOT NULL,
  "previous_value" double precision,
  "threshold_value" double precision NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_metric_alert_incidents_rule" ON "metric_alert_incidents" ("metric_alert_rule_id");
CREATE INDEX "idx_metric_alert_incidents_open" ON "metric_alert_incidents" ("metric_alert_rule_id") WHERE "resolved_at" IS NULL;

CREATE TABLE "metric_alert_state_log" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "metric_alert_rule_id" uuid NOT NULL REFERENCES "metric_alert_rules"("id") ON DELETE CASCADE,
  "target_id" uuid NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE,
  "from_state" "metric_alert_state" NOT NULL,
  "to_state" "metric_alert_state" NOT NULL,
  "value" double precision,
  "previous_value" double precision,
  "threshold_value" double precision,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_metric_alert_state_log_rule" ON "metric_alert_state_log" ("metric_alert_rule_id", "created_at");
CREATE INDEX "idx_metric_alert_state_log_target" ON "metric_alert_state_log" ("target_id", "created_at");
CREATE INDEX "idx_metric_alert_state_log_expires" ON "metric_alert_state_log" ("expires_at");
`,
} satisfies MigrationExecutor;
