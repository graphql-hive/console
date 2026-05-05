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
  "time_window_minutes" integer NOT NULL,
  "metric" "metric_alert_metric",
  "threshold_type" "metric_alert_threshold_type" NOT NULL,
  "threshold_value" double precision NOT NULL,
  "direction" "metric_alert_direction" NOT NULL,
  "severity" "metric_alert_severity" NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "enabled" boolean NOT NULL,
  "last_evaluated_at" timestamptz,
  "last_triggered_at" timestamptz,
  "state" "metric_alert_state" NOT NULL,
  "state_changed_at" timestamptz,
  "confirmation_minutes" integer NOT NULL,
  "saved_filter_id" uuid REFERENCES "saved_filters"("id") ON DELETE SET NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "metric_alert_rules_metric_required" CHECK (
    ("type" = 'LATENCY' AND "metric" IS NOT NULL) OR ("type" != 'LATENCY' AND "metric" IS NULL)
  )
);

-- Evaluator hot path. The cron's fetchEnabledRules query scans this and the
-- application groups by (target_id, ...) for ClickHouse batching. Indexing
-- on target_id (partial on enabled = true) lets a future fan-out worker
-- slice the work by target_id range or hash without re-scanning the table.
CREATE INDEX "idx_metric_alert_rules_enabled_target" ON "metric_alert_rules" ("target_id") WHERE "enabled" = true;
-- FK-cascade indexes. Every "ON DELETE CASCADE / SET NULL" needs an index on
-- its referencing column or the cascade falls back to a full table scan when
-- the parent row is deleted. target_id and project_id also serve
-- application-level reads (rule lists per target/project) including disabled
-- rules; the partial above doesn't cover those.
CREATE INDEX "idx_metric_alert_rules_organization" ON "metric_alert_rules" ("organization_id");
CREATE INDEX "idx_metric_alert_rules_project" ON "metric_alert_rules" ("project_id");
CREATE INDEX "idx_metric_alert_rules_target" ON "metric_alert_rules" ("target_id");
CREATE INDEX "idx_metric_alert_rules_created_by" ON "metric_alert_rules" ("created_by_user_id");
CREATE INDEX "idx_metric_alert_rules_updated_by" ON "metric_alert_rules" ("updated_by_user_id");
CREATE INDEX "idx_metric_alert_rules_saved_filter" ON "metric_alert_rules" ("saved_filter_id");

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
