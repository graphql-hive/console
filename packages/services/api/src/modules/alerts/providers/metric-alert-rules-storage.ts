import DataLoader from 'dataloader';
import { Injectable, Scope } from 'graphql-modules';
import * as zod from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import type {
  MetricAlertIncident,
  MetricAlertRule,
  MetricAlertRuleState,
  MetricAlertStateLogEntry,
} from '../../../shared/entities';
import { METRIC_ALERT_RULES_PER_TARGET_LIMIT } from '../../commerce/constants';

/**
 * Thrown by `addMetricAlertRule` when the per-target cap is reached. The
 * resolver catches this to translate into the structured `{ error: { message } }`
 * mutation result. The check happens inside the same transaction as the
 * insert (after `SELECT ... FOR UPDATE` on the target row) so concurrent
 * submissions cannot bypass the cap.
 */
export class MetricAlertRuleLimitExceededError extends Error {
  constructor(public readonly limit: number) {
    super(`Limit of ${limit} metric alert rules per target reached.`);
    this.name = 'MetricAlertRuleLimitExceededError';
  }
}

/**
 * Cursor encoding for `getIncidentConnection`. Encodes both `started_at` and
 * `id` so the cursor is stable under concurrent inserts (newer incidents
 * inserted between page fetches don't shift the page boundary).
 */
export function encodeIncidentCursor(incident: { startedAt: string; id: string }): string {
  return Buffer.from(`${incident.startedAt}|${incident.id}`, 'utf8').toString('base64url');
}

export function decodeIncidentCursor(cursor: string): { startedAt: Date; id: string } | null {
  try {
    const [startedAtIso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (!startedAtIso || !id) return null;
    const startedAt = new Date(startedAtIso);
    if (Number.isNaN(startedAt.getTime())) return null;
    return { startedAt, id };
  } catch {
    return null;
  }
}

const MetricAlertRuleModel = zod
  .object({
    id: zod.string(),
    organizationId: zod.string(),
    projectId: zod.string(),
    targetId: zod.string(),
    createdByUserId: zod.string().nullable(),
    updatedByUserId: zod.string().nullable(),
    type: zod.enum(['LATENCY', 'ERROR_RATE', 'TRAFFIC']),
    timeWindowMinutes: zod.number(),
    metric: zod.enum(['AVG', 'P75', 'P90', 'P95', 'P99']).nullable(),
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
  })
  .refine(data => (data.type === 'LATENCY') === (data.metric !== null), {
    message: 'metric must be set for LATENCY type and null for other types',
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
  , "created_by_user_id" as "createdByUserId"
  , "updated_by_user_id" as "updatedByUserId"
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
  // Per-request batcher: when a list of rules is queried and each rule
  // resolves its `channels` field, this collapses N independent SELECTs on
  // `metric_alert_rule_channels` into a single IN-list query. Operation-scoped
  // so it's torn down at the end of each GraphQL request.
  private channelIdsByRuleLoader = new DataLoader<string, string[]>(
    async ruleIds => {
      const rows = await this.pool.any(psql`/* batchedRuleChannelIds */
        SELECT "metric_alert_rule_id" as "ruleId", "alert_channel_id" as "channelId"
        FROM "metric_alert_rule_channels"
        WHERE "metric_alert_rule_id" = ANY(${psql.array([...ruleIds], 'uuid')})
      `);
      const rowSchema = zod.object({ ruleId: zod.string(), channelId: zod.string() });
      const byRule = new Map<string, string[]>();
      for (const raw of rows) {
        const row = rowSchema.parse(raw);
        const list = byRule.get(row.ruleId);
        if (list) {
          list.push(row.channelId);
        } else {
          byRule.set(row.ruleId, [row.channelId]);
        }
      }
      return ruleIds.map(id => byRule.get(id) ?? []);
    },
    { cache: true },
  );

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

  async countMetricAlertRulesByTarget(args: { targetId: string }): Promise<number> {
    const result = await this.pool.oneFirst(psql`/* countMetricAlertRulesByTarget */
      SELECT count(*)::int
      FROM "metric_alert_rules"
      WHERE "target_id" = ${args.targetId}
    `);
    return zod.number().parse(result);
  }

  async addMetricAlertRule(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    createdByUserId: string | null;
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
    channelIds: ReadonlyArray<string>;
  }): Promise<MetricAlertRule> {
    // The rule row and its channel-link rows have to land atomically: a
    // partial commit (rule inserted, channels insert fails) leaves a
    // rule with no notification destinations and a request that can't
    // be safely retried because the rule name (or other unique-per-
    // request fields) would conflict.
    //
    // `enabled` and `state` are domain invariants for newly-created rules:
    // every rule is created enabled, and every rule starts in the NORMAL
    // state of the evaluation state machine. We set them here rather than
    // at the DB layer (no column DEFAULTs) so the application stays the
    // source of truth for these values.
    const result = await this.pool.transaction('addMetricAlertRule', async trx => {
      // Race-safe per-target cap. SELECT ... FOR UPDATE on the target row
      // serializes concurrent rule creates against the same target so the
      // count below reflects every prior committed insert. The lock is held
      // only for the duration of this transaction (count + inserts), and
      // only blocks other writers — concurrent reads of the rule list are
      // unaffected. Resolver-layer best-effort check at addMetricAlertRule.ts
      // handles the common UX path; this guard catches the rare race window.
      await trx.query(psql`/* addMetricAlertRule:lockTarget */
        SELECT "id" FROM "targets" WHERE "id" = ${args.targetId} FOR UPDATE
      `);
      const currentCount = zod.number().parse(
        await trx.oneFirst(psql`/* addMetricAlertRule:count */
          SELECT count(*)::int
          FROM "metric_alert_rules"
          WHERE "target_id" = ${args.targetId}
        `),
      );
      if (currentCount >= METRIC_ALERT_RULES_PER_TARGET_LIMIT) {
        throw new MetricAlertRuleLimitExceededError(METRIC_ALERT_RULES_PER_TARGET_LIMIT);
      }

      const ruleRow = await trx.one(psql`/* addMetricAlertRule:rule */
        INSERT INTO "metric_alert_rules" (
          "organization_id"
          , "project_id"
          , "target_id"
          , "created_by_user_id"
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
          , "enabled"
          , "state"
        )
        VALUES (
          ${args.organizationId}
          , ${args.projectId}
          , ${args.targetId}
          , ${args.createdByUserId}
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
          , true
          , 'NORMAL'
        )
        RETURNING ${METRIC_ALERT_RULE_SELECT}
      `);
      const rule = MetricAlertRuleModel.parse(ruleRow) as MetricAlertRule;

      if (args.channelIds.length > 0) {
        await trx.query(psql`/* addMetricAlertRule:channels */
          INSERT INTO "metric_alert_rule_channels" ("metric_alert_rule_id", "alert_channel_id")
          SELECT ${rule.id}, unnest(${psql.array([...args.channelIds], 'uuid')})
        `);
      }

      return rule;
    });

    // Prime the channel-IDs DataLoader so the post-mutation response read
    // returns what we just wrote, not whatever was cached before the insert.
    this.channelIdsByRuleLoader.clear(result.id).prime(result.id, [...args.channelIds]);

    return result;
  }

  async updateMetricAlertRule(args: {
    id: string;
    updatedByUserId: string | null;
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
    /**
     * When provided, replaces the rule's full set of channel links. Pass
     * `undefined` to leave the existing channels untouched. The rule update
     * and the channel replacement happen in a single transaction so a
     * failure on either side rolls back the other.
     */
    channelIds?: ReadonlyArray<string>;
  }): Promise<MetricAlertRule | null> {
    const result = await this.pool.transaction('updateMetricAlertRule', async trx => {
      const ruleRow = await trx.maybeOne(psql`/* updateMetricAlertRule:rule */
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
          , "updated_by_user_id" = ${args.updatedByUserId}
        WHERE
          "id" = ${args.id}
        RETURNING ${METRIC_ALERT_RULE_SELECT}
      `);

      if (ruleRow === null) {
        return null;
      }

      if (args.channelIds !== undefined) {
        await trx.query(psql`/* updateMetricAlertRule:clearChannels */
          DELETE FROM "metric_alert_rule_channels"
          WHERE "metric_alert_rule_id" = ${args.id}
        `);

        if (args.channelIds.length > 0) {
          await trx.query(psql`/* updateMetricAlertRule:setChannels */
            INSERT INTO "metric_alert_rule_channels" ("metric_alert_rule_id", "alert_channel_id")
            SELECT ${args.id}, unnest(${psql.array([...args.channelIds], 'uuid')})
          `);
        }
      }

      return MetricAlertRuleModel.parse(ruleRow) as MetricAlertRule;
    });

    if (result !== null && args.channelIds !== undefined) {
      this.channelIdsByRuleLoader.clear(args.id).prime(args.id, [...args.channelIds]);
    }

    return result;
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
  //
  // Channel-link writes (insert / replace) are inlined into
  // `addMetricAlertRule` and `updateMetricAlertRule` so the rule-row write
  // and channel-link writes share a transaction. A standalone setRuleChannels
  // helper used to live here, but every caller needed the rule write and
  // channel write to be atomic, so the helper just hid that need.

  async getRuleChannelIds(args: { ruleId: string }): Promise<string[]> {
    return this.channelIdsByRuleLoader.load(args.ruleId);
  }

  /**
   * Returns the `project_id` for each existing channel in `channelIds`.
   * Used by mutation resolvers to validate that channels belong to the same
   * project as the rule's target. Missing rows (channelId not found) are
   * silently dropped — the caller compares the result length against the
   * input length to detect them.
   */
  async getChannelProjectIds(channelIds: ReadonlyArray<string>): Promise<string[]> {
    if (channelIds.length === 0) return [];
    const result = await this.pool.anyFirst(psql`/* getChannelProjectIds */
      SELECT "project_id"
      FROM "alert_channels"
      WHERE "id" = ANY(${psql.array([...channelIds], 'uuid')})
    `);
    return result.map(id => zod.string().parse(id));
  }

  /**
   * Returns the `project_id` of the saved filter, or null if not found.
   * Used by mutation resolvers to validate cross-scope.
   */
  async getSavedFilterProjectId(savedFilterId: string): Promise<string | null> {
    const result = await this.pool.maybeOneFirst(psql`/* getSavedFilterProjectId */
      SELECT "project_id"
      FROM "saved_filters"
      WHERE "id" = ${savedFilterId}
    `);
    return result === null ? null : zod.string().parse(result);
  }

  // --- Incidents ---
  //
  // Note: state-machine writes (state / state_changed_at / last_triggered_at)
  // happen exclusively from the workflows evaluator's `updateState` helper at
  // packages/services/workflows/src/lib/metric-alert-evaluator.ts. The
  // evaluator only bumps `last_triggered_at` on the genuine PENDING → FIRING
  // transition; subsequent FIRING ticks and RECOVERING → FIRING re-entries
  // leave it untouched, so it always reflects the current incident's first
  // trigger time. If a future API-side caller needs to mutate rule state, it
  // should preserve those semantics.

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

  /**
   * Cursor-paginated incident history (newest first). The cursor is base64 of
   * `${started_at_iso}|${id}` so it's stable under concurrent inserts: a
   * newer incident inserted between page fetches doesn't shift the boundary
   * because the cursor encodes both the timestamp and the row's id.
   */
  async getIncidentConnection(args: {
    ruleId: string;
    first?: number | null;
    after?: string | null;
  }) {
    const limit = Math.min(Math.max(args.first ?? 20, 1), 100);
    const cursor = args.after ? decodeIncidentCursor(args.after) : null;

    // Fetch limit + 1 to detect hasNextPage without a separate count query.
    const result = await this.pool.any(psql`/* getIncidentConnection */
      SELECT ${METRIC_ALERT_INCIDENT_SELECT}
      FROM "metric_alert_incidents"
      WHERE
        "metric_alert_rule_id" = ${args.ruleId}
        ${
          cursor
            ? psql`AND ("started_at", "id") < (${cursor.startedAt.toISOString()}, ${cursor.id})`
            : psql``
        }
      ORDER BY "started_at" DESC, "id" DESC
      LIMIT ${limit + 1}
    `);

    const rows = result.map(row => MetricAlertIncidentModel.parse(row) as MetricAlertIncident);
    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const edges = items.map(node => ({
      node,
      get cursor() {
        return encodeIncidentCursor(node);
      },
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        get endCursor() {
          return edges[edges.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return edges[0]?.cursor ?? '';
        },
      },
    };
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

  async getEventCount(args: { ruleId: string; from: Date; to: Date }): Promise<number> {
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
