import { Injectable, Scope } from 'graphql-modules';
import * as zod from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import type {
  MetricAlertIncident,
  MetricAlertRule,
  MetricAlertRuleState,
  MetricAlertStateLogEntry,
} from '../../../shared/entities';

const MetricAlertRuleModel = zod.object({
  id: zod.string(),
  organizationId: zod.string(),
  projectId: zod.string(),
  targetId: zod.string(),
  type: zod.enum(['LATENCY', 'ERROR_RATE', 'TRAFFIC']),
  timeWindowMinutes: zod.number(),
  metric: zod.enum(['avg', 'p75', 'p90', 'p95', 'p99']).nullable(),
  thresholdType: zod.enum(['FIXED_VALUE', 'PERCENTAGE_CHANGE']),
  thresholdValue: zod.number(),
  direction: zod.enum(['ABOVE', 'BELOW']),
  severity: zod.enum(['INFO', 'WARNING', 'CRITICAL']),
  name: zod.string(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
  enabled: zod.boolean(),
  lastEvaluatedAt: zod.string().nullable(),
  lastTriggeredAt: zod.string().nullable(),
  state: zod.enum(['NORMAL', 'PENDING', 'FIRING', 'RECOVERING']),
  stateChangedAt: zod.string().nullable(),
  confirmationMinutes: zod.number(),
  savedFilterId: zod.string().nullable(),
});

const MetricAlertIncidentModel = zod.object({
  id: zod.string(),
  metricAlertRuleId: zod.string(),
  startedAt: zod.string(),
  resolvedAt: zod.string().nullable(),
  currentValue: zod.number(),
  previousValue: zod.number().nullable(),
  thresholdValue: zod.number(),
});

const MetricAlertStateLogModel = zod.object({
  id: zod.string(),
  metricAlertRuleId: zod.string(),
  targetId: zod.string(),
  fromState: zod.enum(['NORMAL', 'PENDING', 'FIRING', 'RECOVERING']),
  toState: zod.enum(['NORMAL', 'PENDING', 'FIRING', 'RECOVERING']),
  value: zod.number().nullable(),
  previousValue: zod.number().nullable(),
  thresholdValue: zod.number().nullable(),
  createdAt: zod.string(),
  expiresAt: zod.string(),
});

const METRIC_ALERT_RULE_SELECT = psql`
  "id"
  , "organization_id" as "organizationId"
  , "project_id" as "projectId"
  , "target_id" as "targetId"
  , "type"
  , "time_window_minutes" as "timeWindowMinutes"
  , "metric"
  , "threshold_type" as "thresholdType"
  , "threshold_value" as "thresholdValue"
  , "direction"
  , "severity"
  , "name"
  , to_json("created_at") as "createdAt"
  , to_json("updated_at") as "updatedAt"
  , "enabled"
  , to_json("last_evaluated_at") as "lastEvaluatedAt"
  , to_json("last_triggered_at") as "lastTriggeredAt"
  , "state"
  , to_json("state_changed_at") as "stateChangedAt"
  , "confirmation_minutes" as "confirmationMinutes"
  , "saved_filter_id" as "savedFilterId"
`;

const METRIC_ALERT_INCIDENT_SELECT = psql`
  "id"
  , "metric_alert_rule_id" as "metricAlertRuleId"
  , to_json("started_at") as "startedAt"
  , to_json("resolved_at") as "resolvedAt"
  , "current_value" as "currentValue"
  , "previous_value" as "previousValue"
  , "threshold_value" as "thresholdValue"
`;

const METRIC_ALERT_STATE_LOG_SELECT = psql`
  "id"
  , "metric_alert_rule_id" as "metricAlertRuleId"
  , "target_id" as "targetId"
  , "from_state" as "fromState"
  , "to_state" as "toState"
  , "value"
  , "previous_value" as "previousValue"
  , "threshold_value" as "thresholdValue"
  , to_json("created_at") as "createdAt"
  , to_json("expires_at") as "expiresAt"
`;

@Injectable({
  scope: Scope.Operation,
})
export class MetricAlertRulesStorage {
  constructor(private pool: PostgresDatabasePool) {}

  // --- Alert Rule CRUD ---

  async getMetricAlertRule(args: { id: string }): Promise<MetricAlertRule | null> {
    const result = await this.pool.maybeOne(psql`/* getMetricAlertRule */
      SELECT ${METRIC_ALERT_RULE_SELECT}
      FROM "metric_alert_rules"
      WHERE "id" = ${args.id}
    `);

    if (result === null) {
      return null;
    }

    return MetricAlertRuleModel.parse(result) as MetricAlertRule;
  }

  async getMetricAlertRules(args: { projectId: string }): Promise<MetricAlertRule[]> {
    const result = await this.pool.any(psql`/* getMetricAlertRules */
      SELECT ${METRIC_ALERT_RULE_SELECT}
      FROM "metric_alert_rules"
      WHERE "project_id" = ${args.projectId}
      ORDER BY "created_at" DESC
    `);

    return result.map(row => MetricAlertRuleModel.parse(row) as MetricAlertRule);
  }

  async getMetricAlertRulesByTarget(args: { targetId: string }): Promise<MetricAlertRule[]> {
    const result = await this.pool.any(psql`/* getMetricAlertRulesByTarget */
      SELECT ${METRIC_ALERT_RULE_SELECT}
      FROM "metric_alert_rules"
      WHERE "target_id" = ${args.targetId}
      ORDER BY "created_at" DESC
    `);

    return result.map(row => MetricAlertRuleModel.parse(row) as MetricAlertRule);
  }

  async getAllEnabledMetricAlertRules(): Promise<MetricAlertRule[]> {
    const result = await this.pool.any(psql`/* getAllEnabledMetricAlertRules */
      SELECT ${METRIC_ALERT_RULE_SELECT}
      FROM "metric_alert_rules"
      WHERE "enabled" = true
      ORDER BY "id"
    `);

    return result.map(row => MetricAlertRuleModel.parse(row) as MetricAlertRule);
  }

  async addMetricAlertRule(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    type: MetricAlertRule['type'];
    timeWindowMinutes: number;
    metric: MetricAlertRule['metric'];
    thresholdType: MetricAlertRule['thresholdType'];
    thresholdValue: number;
    direction: MetricAlertRule['direction'];
    severity: MetricAlertRule['severity'];
    name: string;
    confirmationMinutes: number;
    savedFilterId: string | null;
  }): Promise<MetricAlertRule> {
    const result = await this.pool.one(psql`/* addMetricAlertRule */
      INSERT INTO "metric_alert_rules" (
        "organization_id"
        , "project_id"
        , "target_id"
        , "type"
        , "time_window_minutes"
        , "metric"
        , "threshold_type"
        , "threshold_value"
        , "direction"
        , "severity"
        , "name"
        , "confirmation_minutes"
        , "saved_filter_id"
      )
      VALUES (
        ${args.organizationId}
        , ${args.projectId}
        , ${args.targetId}
        , ${args.type}
        , ${args.timeWindowMinutes}
        , ${args.metric}
        , ${args.thresholdType}
        , ${args.thresholdValue}
        , ${args.direction}
        , ${args.severity}
        , ${args.name}
        , ${args.confirmationMinutes}
        , ${args.savedFilterId}
      )
      RETURNING ${METRIC_ALERT_RULE_SELECT}
    `);

    return MetricAlertRuleModel.parse(result) as MetricAlertRule;
  }

  async updateMetricAlertRule(args: {
    id: string;
    type?: MetricAlertRule['type'];
    timeWindowMinutes?: number;
    metric?: MetricAlertRule['metric'];
    thresholdType?: MetricAlertRule['thresholdType'];
    thresholdValue?: number;
    direction?: MetricAlertRule['direction'];
    severity?: MetricAlertRule['severity'];
    name?: string;
    confirmationMinutes?: number;
    savedFilterId?: string | null;
    enabled?: boolean;
  }): Promise<MetricAlertRule | null> {
    const result = await this.pool.maybeOne(psql`/* updateMetricAlertRule */
      UPDATE "metric_alert_rules"
      SET
        "type" = COALESCE(${args.type ?? null}, "type")
        , "time_window_minutes" = COALESCE(${args.timeWindowMinutes ?? null}, "time_window_minutes")
        , "metric" = COALESCE(${args.metric ?? null}, "metric")
        , "threshold_type" = COALESCE(${args.thresholdType ?? null}, "threshold_type")
        , "threshold_value" = COALESCE(${args.thresholdValue ?? null}, "threshold_value")
        , "direction" = COALESCE(${args.direction ?? null}, "direction")
        , "severity" = COALESCE(${args.severity ?? null}, "severity")
        , "name" = COALESCE(${args.name ?? null}, "name")
        , "confirmation_minutes" = COALESCE(${args.confirmationMinutes ?? null}, "confirmation_minutes")
        , "saved_filter_id" = COALESCE(${args.savedFilterId ?? null}, "saved_filter_id")
        , "enabled" = COALESCE(${args.enabled ?? null}, "enabled")
        , "updated_at" = NOW()
      WHERE
        "id" = ${args.id}
      RETURNING ${METRIC_ALERT_RULE_SELECT}
    `);

    if (result === null) {
      return null;
    }

    return MetricAlertRuleModel.parse(result) as MetricAlertRule;
  }

  async deleteMetricAlertRules(args: {
    projectId: string;
    ruleIds: string[];
  }): Promise<MetricAlertRule[]> {
    const result = await this.pool.any(psql`/* deleteMetricAlertRules */
      DELETE FROM "metric_alert_rules"
      WHERE
        "project_id" = ${args.projectId}
        AND "id" = ANY(${psql.array(args.ruleIds, 'uuid')})
      RETURNING ${METRIC_ALERT_RULE_SELECT}
    `);

    return result.map(row => MetricAlertRuleModel.parse(row) as MetricAlertRule);
  }

  // --- Rule Channels (many-to-many) ---

  async setRuleChannels(args: {
    ruleId: string;
    channelIds: string[];
  }): Promise<void> {
    await this.pool.transaction('setRuleChannels', async trx => {
      await trx.query(psql`
        DELETE FROM "metric_alert_rule_channels"
        WHERE "metric_alert_rule_id" = ${args.ruleId}
      `);

      if (args.channelIds.length > 0) {
        await trx.query(psql`
          INSERT INTO "metric_alert_rule_channels" ("metric_alert_rule_id", "alert_channel_id")
          SELECT ${args.ruleId}, unnest(${psql.array(args.channelIds, 'uuid')})
        `);
      }
    });
  }

  async getRuleChannelIds(args: { ruleId: string }): Promise<string[]> {
    const result = await this.pool.anyFirst(psql`/* getRuleChannelIds */
      SELECT "alert_channel_id"
      FROM "metric_alert_rule_channels"
      WHERE "metric_alert_rule_id" = ${args.ruleId}
    `);

    return result.map(id => zod.string().parse(id));
  }

  // --- Alert State Updates (used by evaluation engine) ---

  async updateRuleState(args: {
    id: string;
    state: MetricAlertRuleState;
    stateChangedAt?: Date;
    lastEvaluatedAt?: Date;
    lastTriggeredAt?: Date;
  }): Promise<void> {
    await this.pool.query(psql`/* updateRuleState */
      UPDATE "metric_alert_rules"
      SET
        "state" = ${args.state}
        , "state_changed_at" = COALESCE(${args.stateChangedAt?.toISOString() ?? null}, "state_changed_at")
        , "last_evaluated_at" = COALESCE(${args.lastEvaluatedAt?.toISOString() ?? null}, "last_evaluated_at")
        , "last_triggered_at" = COALESCE(${args.lastTriggeredAt?.toISOString() ?? null}, "last_triggered_at")
        , "updated_at" = NOW()
      WHERE
        "id" = ${args.id}
    `);
  }

  // --- Incidents ---

  async createIncident(args: {
    ruleId: string;
    currentValue: number;
    previousValue: number | null;
    thresholdValue: number;
  }): Promise<MetricAlertIncident> {
    const result = await this.pool.one(psql`/* createIncident */
      INSERT INTO "metric_alert_incidents" (
        "metric_alert_rule_id"
        , "current_value"
        , "previous_value"
        , "threshold_value"
      )
      VALUES (
        ${args.ruleId}
        , ${args.currentValue}
        , ${args.previousValue}
        , ${args.thresholdValue}
      )
      RETURNING ${METRIC_ALERT_INCIDENT_SELECT}
    `);

    return MetricAlertIncidentModel.parse(result) as MetricAlertIncident;
  }

  async resolveIncident(args: { ruleId: string }): Promise<MetricAlertIncident | null> {
    const result = await this.pool.maybeOne(psql`/* resolveIncident */
      UPDATE "metric_alert_incidents"
      SET "resolved_at" = NOW()
      WHERE
        "metric_alert_rule_id" = ${args.ruleId}
        AND "resolved_at" IS NULL
      RETURNING ${METRIC_ALERT_INCIDENT_SELECT}
    `);

    if (result === null) {
      return null;
    }

    return MetricAlertIncidentModel.parse(result) as MetricAlertIncident;
  }

  async getOpenIncident(args: { ruleId: string }): Promise<MetricAlertIncident | null> {
    const result = await this.pool.maybeOne(psql`/* getOpenIncident */
      SELECT ${METRIC_ALERT_INCIDENT_SELECT}
      FROM "metric_alert_incidents"
      WHERE
        "metric_alert_rule_id" = ${args.ruleId}
        AND "resolved_at" IS NULL
    `);

    if (result === null) {
      return null;
    }

    return MetricAlertIncidentModel.parse(result) as MetricAlertIncident;
  }

  async getIncidentHistory(args: {
    ruleId: string;
    limit: number;
    offset: number;
  }): Promise<MetricAlertIncident[]> {
    const result = await this.pool.any(psql`/* getIncidentHistory */
      SELECT ${METRIC_ALERT_INCIDENT_SELECT}
      FROM "metric_alert_incidents"
      WHERE "metric_alert_rule_id" = ${args.ruleId}
      ORDER BY "started_at" DESC
      LIMIT ${args.limit}
      OFFSET ${args.offset}
    `);

    return result.map(row => MetricAlertIncidentModel.parse(row) as MetricAlertIncident);
  }

  // --- State Log ---

  async logStateTransition(args: {
    ruleId: string;
    targetId: string;
    fromState: MetricAlertRuleState;
    toState: MetricAlertRuleState;
    value: number | null;
    previousValue: number | null;
    thresholdValue: number | null;
    expiresAt: Date;
  }): Promise<MetricAlertStateLogEntry> {
    const result = await this.pool.one(psql`/* logStateTransition */
      INSERT INTO "metric_alert_state_log" (
        "metric_alert_rule_id"
        , "target_id"
        , "from_state"
        , "to_state"
        , "value"
        , "previous_value"
        , "threshold_value"
        , "expires_at"
      )
      VALUES (
        ${args.ruleId}
        , ${args.targetId}
        , ${args.fromState}
        , ${args.toState}
        , ${args.value}
        , ${args.previousValue}
        , ${args.thresholdValue}
        , ${args.expiresAt.toISOString()}
      )
      RETURNING ${METRIC_ALERT_STATE_LOG_SELECT}
    `);

    return MetricAlertStateLogModel.parse(result) as MetricAlertStateLogEntry;
  }

  async getStateLog(args: {
    ruleId: string;
    from: Date;
    to: Date;
  }): Promise<MetricAlertStateLogEntry[]> {
    const result = await this.pool.any(psql`/* getStateLog */
      SELECT ${METRIC_ALERT_STATE_LOG_SELECT}
      FROM "metric_alert_state_log"
      WHERE
        "metric_alert_rule_id" = ${args.ruleId}
        AND "created_at" >= ${args.from.toISOString()}
        AND "created_at" <= ${args.to.toISOString()}
      ORDER BY "created_at" DESC
    `);

    return result.map(row => MetricAlertStateLogModel.parse(row) as MetricAlertStateLogEntry);
  }

  async getStateLogByTarget(args: {
    targetId: string;
    from: Date;
    to: Date;
  }): Promise<MetricAlertStateLogEntry[]> {
    const result = await this.pool.any(psql`/* getStateLogByTarget */
      SELECT ${METRIC_ALERT_STATE_LOG_SELECT}
      FROM "metric_alert_state_log"
      WHERE
        "target_id" = ${args.targetId}
        AND "created_at" >= ${args.from.toISOString()}
        AND "created_at" <= ${args.to.toISOString()}
      ORDER BY "created_at" DESC
    `);

    return result.map(row => MetricAlertStateLogModel.parse(row) as MetricAlertStateLogEntry);
  }

  async getEventCount(args: {
    ruleId: string;
    from: Date;
    to: Date;
  }): Promise<number> {
    const result = await this.pool.oneFirst(psql`/* getEventCount */
      SELECT count(*)::int
      FROM "metric_alert_state_log"
      WHERE
        "metric_alert_rule_id" = ${args.ruleId}
        AND "created_at" >= ${args.from.toISOString()}
        AND "created_at" <= ${args.to.toISOString()}
    `);

    return zod.number().parse(result);
  }

  async purgeExpiredStateLog(): Promise<number> {
    const result = await this.pool.oneFirst(psql`/* purgeExpiredStateLog */
      WITH deleted AS (
        DELETE FROM "metric_alert_state_log"
        WHERE "expires_at" < NOW()
        RETURNING 1
      )
      SELECT count(*)::int FROM deleted
    `);

    return zod.number().parse(result);
  }
}
