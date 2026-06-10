import { z } from 'zod';
import type { Logger } from '@graphql-hive/logger';
import {
  buildOperationsFilterSQLConditions,
  sql,
  toQueryParams,
  type SqlValue,
} from '@hive/clickhouse';
import type { CommonQueryMethods, PostgresDatabasePool } from '@hive/postgres';
import { psql } from '@hive/postgres';
import { metricAlertClickHouseQueryDuration } from '../metrics.js';
import type { ClickHouseClient } from './clickhouse-client.js';

// Schema is the single source of truth for the row shape we read from
// Postgres in `fetchEnabledRules` below. The exported `MetricAlertRuleRow`
// type is inferred from it so the compile-time shape and the runtime
// validation can't drift apart. The matching SELECT in `fetchEnabledRules`
// must keep its column aliases aligned with the keys here.
const MetricAlertRuleRowSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  targetId: z.string(),
  name: z.string(),
  type: z.enum(['LATENCY', 'ERROR_RATE', 'TRAFFIC']),
  timeWindowMinutes: z.number(),
  metric: z.enum(['AVG', 'P75', 'P90', 'P95', 'P99']).nullable(),
  thresholdType: z.enum(['FIXED_VALUE', 'PERCENTAGE_CHANGE']),
  thresholdValue: z.number(),
  direction: z.enum(['ABOVE', 'BELOW']),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  state: z.enum(['NORMAL', 'PENDING', 'FIRING', 'RECOVERING']),
  stateChangedAt: z.string().nullable(),
  confirmationMinutes: z.number(),
  savedFilterId: z.string().nullable(),
  // The attached saved filter's `filters` jsonb (or null). Kept as `unknown` so a
  // malformed/legacy blob can't fail the bulk parse and halt evaluation of EVERY
  // rule...its shape is validated defensively per-group in `buildSavedFilterConditions`.
  savedFilterFilters: z.unknown().nullable(),
  /** Plan name of the rule's organization. Drives state-log retention. */
  organizationPlanName: z.string().nullable(),
});

export type MetricAlertRuleRow = z.infer<typeof MetricAlertRuleRowSchema>;

// Schema for ClickHouse window rows. `total` and `total_ok` come back as
// strings because ClickHouse encodes UInt64 as a string in its JSON output
// (the value can exceed JS Number.MAX_SAFE_INTEGER). `percentiles` is a
// fixed 4-tuple matching the SELECT in `buildClickHouseWindowSQL`.
const ClickHouseWindowRowSchema = z.object({
  window: z.enum(['current', 'previous']),
  total: z.string(),
  total_ok: z.string(),
  average: z.number(),
  percentiles: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

type ClickHouseWindowRow = z.infer<typeof ClickHouseWindowRowSchema>;

type GroupKey = string;

function makeGroupKey(rule: MetricAlertRuleRow): GroupKey {
  return `${rule.targetId}:${rule.timeWindowMinutes}:${rule.savedFilterId ?? ''}`;
}

// Nanoseconds per millisecond. ClickHouse stores operation durations in
// nanoseconds; latency rule thresholds and all display surfaces use ms.
const NS_TO_MS = 1e6;

function extractMetricValue(row: ClickHouseWindowRow, rule: MetricAlertRuleRow): number {
  const total = Number(row.total);
  const totalOk = Number(row.total_ok);

  switch (rule.type) {
    case 'TRAFFIC':
      return total;
    case 'ERROR_RATE':
      return total > 0 ? ((total - totalOk) / total) * 100 : 0;
    case 'LATENCY': {
      const metricMap: Record<string, number> = {
        AVG: row.average,
        P75: row.percentiles[0],
        P90: row.percentiles[1],
        P95: row.percentiles[2],
        P99: row.percentiles[3],
      };
      // ClickHouse stores `duration` in nanoseconds, but rule thresholds (the
      // form input) and every display surface are in
      // milliseconds. Convert here so the threshold comparison and the persisted
      // value are in milliseconds and consistent with all of them. Without this,
      // a ns value (~1.2e9) is compared against a ms threshold (e.g. 4000),
      // so any non-trivial latency trips the rule.
      return (rule.metric ? metricMap[rule.metric] : 0) / NS_TO_MS;
    }
  }
}

function isThresholdBreached(
  currentValue: number,
  previousValue: number,
  rule: MetricAlertRuleRow,
): boolean {
  let compareValue: number;

  if (rule.thresholdType === 'FIXED_VALUE') {
    compareValue = currentValue;
  } else {
    if (previousValue === 0) {
      // Going from 0 → 0 is no change, not breached regardless of direction.
      if (currentValue === 0) return false;
      // Going from 0 → any positive value is mathematically an infinite
      // percentage increase. ABOVE thresholds should always fire (Infinity
      // exceeds any finite percent). BELOW thresholds should never fire
      // (an increase isn't a decrease). Metrics are always non-negative
      // (rates / counts / durations), so currentValue > 0 here.
      compareValue = Number.POSITIVE_INFINITY;
    } else {
      compareValue = ((currentValue - previousValue) / previousValue) * 100;
    }
  }

  return rule.direction === 'ABOVE'
    ? compareValue > rule.thresholdValue
    : compareValue < rule.thresholdValue;
}

/**
 * Alert state-log retention per plan, in days. Workflows doesn't depend on
 * `@hive/api` so this is mirrored from the canonical source at
 * `packages/services/api/src/modules/commerce/constants.ts`
 * (`ALERT_STATE_LOG_RETENTION_DAYS`). Keep these two in sync.
 */
const ALERT_STATE_LOG_RETENTION_DAYS: Record<string, number> = {
  HOBBY: 7,
  PRO: 7,
  ENTERPRISE: 30,
};

function getAlertStateLogRetentionDays(planName: string | null): number {
  return ALERT_STATE_LOG_RETENTION_DAYS[planName ?? 'HOBBY'] ?? 7;
}

function hasElapsed(stateChangedAt: string | null, minutes: number, evaluationTime: Date): boolean {
  if (!stateChangedAt) return true;
  const changedAt = new Date(stateChangedAt).getTime();
  return evaluationTime.getTime() - changedAt >= minutes * 60_000;
}

export async function fetchEnabledRules(pg: PostgresDatabasePool): Promise<MetricAlertRuleRow[]> {
  // Evaluate every enabled rule. The org-level `metricAlertRules` feature flag
  // is a rollout enabler for *creating/seeing* rules in the API, not a gate on
  // evaluation — a rule only exists if someone was authorized to create it.
  // The real per-rule off-switches are the `enabled` column and deleting the rule.
  const result = await pg.any(psql`
    SELECT
      r."id"
      , r."organization_id" as "organizationId"
      , r."project_id" as "projectId"
      , r."target_id" as "targetId"
      , r."name"
      , r."type"
      , r."time_window_minutes" as "timeWindowMinutes"
      , r."metric"
      , r."threshold_type" as "thresholdType"
      , r."threshold_value" as "thresholdValue"
      , r."direction"
      , r."severity"
      , r."state"
      , to_json(r."state_changed_at") as "stateChangedAt"
      , r."confirmation_minutes" as "confirmationMinutes"
      , r."saved_filter_id" as "savedFilterId"
      , sf."filters" as "savedFilterFilters"
      , o."plan_name" as "organizationPlanName"
    FROM "metric_alert_rules" r
    INNER JOIN "organizations" o ON o."id" = r."organization_id"
    LEFT JOIN "saved_filters" sf ON sf."id" = r."saved_filter_id"
    WHERE r."enabled" = true
  `);

  return z.array(MetricAlertRuleRowSchema).parse(result);
}

export function groupRulesByQuery(
  rules: MetricAlertRuleRow[],
): Map<GroupKey, MetricAlertRuleRow[]> {
  const groups = new Map<GroupKey, MetricAlertRuleRow[]>();
  for (const rule of rules) {
    const key = makeGroupKey(rule);
    const group = groups.get(key);
    if (group) {
      group.push(rule);
    } else {
      groups.set(key, [rule]);
    }
  }
  return groups;
}

// Validated shape of the saved-filter `filters` jsonb that the evaluator applies.
// `dateRange` is deliberately NOT read (an alert defines its own rolling window,
// so the filter's saved date range is meaningless here). `.passthrough()` tolerates
// extra fields (e.g. `dateRange`) without failing.
const SavedFilterConditionsSchema = z
  .object({
    operationHashes: z.array(z.string()).optional(),
    clientFilters: z
      .array(
        z.object({
          name: z.string(),
          versions: z.array(z.string()).nullable().optional(),
        }),
      )
      .optional(),
    excludeOperations: z.boolean().optional(),
    excludeClientFilters: z.boolean().optional(),
  })
  .passthrough();

/**
 * Turns a saved filter's raw `filters` jsonb into ClickHouse conditions for the
 * window query, via the same shared builder the analytics API uses (so an alert
 * filters identically to what users see on Insights).
 *
 * Never throws: a null/malformed blob yields NO conditions (the alert evaluates
 * unfiltered) and is logged, so one bad filter can't break the whole batch.
 */
export function buildSavedFilterConditions(rawFilters: unknown, logger: Logger): SqlValue[] {
  if (rawFilters == null) {
    return [];
  }
  const parsed = SavedFilterConditionsSchema.safeParse(rawFilters);
  if (!parsed.success) {
    logger.warn(
      { error: parsed.error },
      'Saved filter on a metric alert rule has an unexpected shape; evaluating unfiltered',
    );
    return [];
  }
  return buildOperationsFilterSQLConditions({
    operations: parsed.data.operationHashes,
    clientVersionFilters: parsed.data.clientFilters?.map(client => ({
      clientName: client.name,
      versions: client.versions ?? null,
    })),
    excludeOperations: parsed.data.excludeOperations,
    excludeClientVersionFilters: parsed.data.excludeClientFilters,
  });
}

export async function queryClickHouseWindows(
  clickhouse: ClickHouseClient,
  targetId: string,
  timeWindowMinutes: number,
  filterConditions: SqlValue[],
  // Anchor windows to the cron's scheduled run time (graphile-worker's
  // job.run_at), not wall-clock now. If the worker is backed up and picks
  // this job up late, using wall-clock would shift the queried window
  // forward and could miss the spike that should have fired the alert.
  evaluationTime: Date,
): Promise<{ current: ClickHouseWindowRow | null; previous: ClickHouseWindowRow | null }> {
  const anchorMs = evaluationTime.getTime();
  const offsetMs = 60_000;
  const windowMs = timeWindowMinutes * 60_000;

  const currentWindowEnd = new Date(anchorMs - offsetMs);
  const currentWindowStart = new Date(anchorMs - offsetMs - windowMs);
  const previousWindowStart = new Date(anchorMs - offsetMs - 2 * windowMs);

  // Unfiltered queries read the target-keyed rollups (operations_by_target_*):
  // they sum across all hashes/clients, exactly what those rollups pre-aggregate,
  // so the query prunes by time instead of scanning the target's whole slice.
  // Filtered queries MUST stay on the legacy tables...the rollups dropped the
  // hash/client dimensions a filter predicates on, so routing one there would
  // reference columns that don't exist. Deriving this from `filterConditions`
  // (rather than a separate flag/param) makes the filtered-query-on-rollup
  // combination unrepresentable.
  const useTargetRollup = filterConditions.length === 0;
  const resolution = timeWindowMinutes <= 360 ? 'minutely' : 'hourly';
  const tableName = useTargetRollup
    ? `operations_by_target_${resolution}`
    : `operations_${resolution}`;

  // The two table families store the percentile column with different aggregate
  // functions: the by_target rollups use quantilesTDigest (more accurate in the
  // tails, merges better), the legacy tables the older quantiles. A merge
  // function must match the state function it reads, so pick it alongside the
  // table. `total`/`total_ok`/`duration_avg` are identical across both.
  const percentilesMerge = useTargetRollup ? 'quantilesTDigestMerge' : 'quantilesMerge';

  // The window timestamps are computed numbers, inlined safely via sql.raw. Every
  // string value (`target` and the saved-filter conditions' arbitrary client/
  // operation strings) is bound as a ClickHouse `param_*` value via the `sql` tag
  // + toQueryParams below, never interpolated (so no manual UUID guarding needed).
  const filterClause =
    filterConditions.length > 0 ? sql` AND ${sql.join(filterConditions, ' AND ')}` : sql``;

  const statement = sql`
    SELECT
      CASE
        WHEN timestamp >= fromUnixTimestamp64Milli(${sql.raw(String(currentWindowStart.getTime()))}) THEN 'current'
        ELSE 'previous'
      END as window,
      sum(total) as total,
      sum(total_ok) as total_ok,
      avgMerge(duration_avg) as average,
      ${sql.raw(percentilesMerge)}(0.75, 0.90, 0.95, 0.99)(duration_quantiles) as percentiles
    FROM ${sql.raw(tableName)}
    WHERE target = ${targetId}
      AND timestamp >= fromUnixTimestamp64Milli(${sql.raw(String(previousWindowStart.getTime()))})
      AND timestamp < fromUnixTimestamp64Milli(${sql.raw(String(currentWindowEnd.getTime()))})
      ${filterClause}
    GROUP BY window
    ORDER BY window
  `;

  // Time every ClickHouse round-trip so the Metric-Alerts dashboard / alert
  // rules can flag degraded latency or rising error rate before users notice
  // stale alert state. Bucketed by outcome so a partial outage shows up
  // distinctly from a slowdown.
  const startMs = Date.now();
  let rows: ClickHouseWindowRow[];
  try {
    const raw = await clickhouse.query(
      statement.sql,
      'metric-alert-windows',
      toQueryParams(statement),
    );
    rows = z.array(ClickHouseWindowRowSchema).parse(raw);
  } catch (error) {
    metricAlertClickHouseQueryDuration.observe({ outcome: 'error' }, (Date.now() - startMs) / 1000);
    throw error;
  }
  metricAlertClickHouseQueryDuration.observe({ outcome: 'success' }, (Date.now() - startMs) / 1000);

  return {
    current: rows.find(r => r.window === 'current') ?? null,
    previous: rows.find(r => r.window === 'previous') ?? null,
  };
}

export async function evaluateRule(args: {
  rule: MetricAlertRuleRow;
  current: ClickHouseWindowRow;
  previous: ClickHouseWindowRow;
  pg: PostgresDatabasePool;
  logger: Logger;
  // Anchor for state_changed_at, last_triggered_at, expires_at, and
  // confirmation-minutes elapsed checks. Passed in (rather than read from
  // the wall clock) so a backed-up worker still produces results consistent
  // with the cron schedule it was meant to run on.
  evaluationTime: Date;
}): Promise<void> {
  const { rule, current, previous, pg, logger, evaluationTime } = args;
  const now = evaluationTime;

  const currentValue = extractMetricValue(current, rule);
  const previousValue = extractMetricValue(previous, rule);
  const breached = isThresholdBreached(currentValue, previousValue, rule);

  // State-log retention is derived from the rule's organization plan, which
  // is included on the row by `fetchEnabledRules` (single JOIN) — no extra
  // database round-trip per rule.
  const retentionDays = getAlertStateLogRetentionDays(rule.organizationPlanName);

  if (breached) {
    switch (rule.state) {
      case 'NORMAL': {
        await pg.transaction('alertEval:normalToPending', async trx => {
          await updateState(trx, rule.id, 'PENDING', now);
          await logTransition(
            trx,
            rule,
            'NORMAL',
            'PENDING',
            currentValue,
            previousValue,
            retentionDays,
            evaluationTime,
          );
        });
        logger.info({ ruleId: rule.id }, 'Alert rule entered PENDING state');
        break;
      }
      case 'PENDING': {
        if (
          rule.confirmationMinutes === 0 ||
          hasElapsed(rule.stateChangedAt, rule.confirmationMinutes, evaluationTime)
        ) {
          await pg.transaction('alertEval:pendingToFiring', async trx => {
            await updateState(trx, rule.id, 'FIRING', now, now);
            const incidentId = await trx
              .oneFirst(
                psql`
                INSERT INTO "metric_alert_incidents" (
                  "metric_alert_rule_id", "current_value", "previous_value", "threshold_value"
                ) VALUES (
                  ${rule.id}, ${currentValue}, ${previousValue}, ${rule.thresholdValue}
                )
                RETURNING "id"
              `,
              )
              .then(z.string().parse);
            const stateLogId = await logTransition(
              trx,
              rule,
              'PENDING',
              'FIRING',
              currentValue,
              previousValue,
              retentionDays,
              evaluationTime,
              incidentId,
            );
            await enqueueChannelNotifications(trx, rule.id, stateLogId);
          });
          logger.info({ ruleId: rule.id }, 'Alert rule entered FIRING state');
        }
        break;
      }
      case 'FIRING': {
        break;
      }
      case 'RECOVERING': {
        await pg.transaction('alertEval:recoveringToFiring', async trx => {
          await updateState(trx, rule.id, 'FIRING', now);
          const incidentId = await trx
            .maybeOneFirst(
              psql`
              SELECT "id" FROM "metric_alert_incidents"
              WHERE "metric_alert_rule_id" = ${rule.id} AND "resolved_at" IS NULL
            `,
            )
            .then(z.string().nullable().parse);
          await logTransition(
            trx,
            rule,
            'RECOVERING',
            'FIRING',
            currentValue,
            previousValue,
            retentionDays,
            evaluationTime,
            incidentId,
          );
        });
        logger.info({ ruleId: rule.id }, 'Alert rule re-entered FIRING from RECOVERING');
        break;
      }
    }
  } else {
    switch (rule.state) {
      case 'NORMAL': {
        break;
      }
      case 'PENDING': {
        await pg.transaction('alertEval:pendingToNormal', async trx => {
          await updateState(trx, rule.id, 'NORMAL', now);
          await logTransition(
            trx,
            rule,
            'PENDING',
            'NORMAL',
            currentValue,
            previousValue,
            retentionDays,
            evaluationTime,
          );
        });
        logger.info(
          { ruleId: rule.id },
          'Alert rule returned to NORMAL from PENDING (false alarm)',
        );
        break;
      }
      case 'FIRING': {
        await pg.transaction('alertEval:firingToRecovering', async trx => {
          await updateState(trx, rule.id, 'RECOVERING', now);
          const incidentId = await trx
            .maybeOneFirst(
              psql`
              SELECT "id" FROM "metric_alert_incidents"
              WHERE "metric_alert_rule_id" = ${rule.id} AND "resolved_at" IS NULL
            `,
            )
            .then(z.string().nullable().parse);
          await logTransition(
            trx,
            rule,
            'FIRING',
            'RECOVERING',
            currentValue,
            previousValue,
            retentionDays,
            evaluationTime,
            incidentId,
          );
        });
        logger.info({ ruleId: rule.id }, 'Alert rule entered RECOVERING state');
        break;
      }
      case 'RECOVERING': {
        if (
          rule.confirmationMinutes === 0 ||
          hasElapsed(rule.stateChangedAt, rule.confirmationMinutes, evaluationTime)
        ) {
          await pg.transaction('alertEval:recoveringToNormal', async trx => {
            await updateState(trx, rule.id, 'NORMAL', now);
            const incidentId = await trx
              .maybeOneFirst(
                psql`
                UPDATE "metric_alert_incidents"
                SET "resolved_at" = NOW()
                WHERE "metric_alert_rule_id" = ${rule.id} AND "resolved_at" IS NULL
                RETURNING "id"
              `,
              )
              .then(z.string().nullable().parse);
            const stateLogId = await logTransition(
              trx,
              rule,
              'RECOVERING',
              'NORMAL',
              currentValue,
              previousValue,
              retentionDays,
              evaluationTime,
              incidentId,
            );
            await enqueueChannelNotifications(trx, rule.id, stateLogId);
          });
          logger.info({ ruleId: rule.id }, 'Alert rule resolved, back to NORMAL');
        }
        break;
      }
    }
  }
}

async function updateState(
  conn: CommonQueryMethods,
  ruleId: string,
  state: string,
  stateChangedAt: Date,
  lastTriggeredAt?: Date,
) {
  await conn.query(psql`
    UPDATE "metric_alert_rules"
    SET
      "state" = ${state}
      , "state_changed_at" = ${stateChangedAt.toISOString()}
      ${lastTriggeredAt ? psql`, "last_triggered_at" = ${lastTriggeredAt.toISOString()}` : psql``}
      , "updated_at" = NOW()
    WHERE "id" = ${ruleId}
  `);
}

async function logTransition(
  conn: CommonQueryMethods,
  rule: MetricAlertRuleRow,
  fromState: string,
  toState: string,
  value: number,
  previousValue: number,
  retentionDays: number,
  evaluationTime: Date,
  incidentId: string | null = null,
): Promise<string> {
  const expiresAt = new Date(evaluationTime.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  const id = await conn.oneFirst(psql`
    INSERT INTO "metric_alert_state_log" (
      "metric_alert_rule_id"
      , "target_id"
      , "incident_id"
      , "from_state"
      , "to_state"
      , "value"
      , "previous_value"
      , "threshold_value"
      , "expires_at"
    ) VALUES (
      ${rule.id}
      , ${rule.targetId}
      , ${incidentId}
      , ${fromState}
      , ${toState}
      , ${value}
      , ${previousValue}
      , ${rule.thresholdValue}
      , ${expiresAt.toISOString()}
    )
    RETURNING "id"
  `);

  return id as string;
}

// Enqueues one `sendMetricAlertChannelNotification` task per channel attached
// to the rule, using graphile-worker's add_job SQL function on the same
// connection as the surrounding tx. If the outer tx rolls back, the enqueued
// jobs roll back too — true atomicity between the state transition and the
// notification intent.
async function enqueueChannelNotifications(
  conn: CommonQueryMethods,
  ruleId: string,
  stateLogId: string,
) {
  await conn.query(psql`
    SELECT graphile_worker.add_job(
      'sendMetricAlertChannelNotification',
      payload => json_build_object(
        'input', json_build_object(
          'stateLogId', ${stateLogId}::text,
          'channelId', marc."alert_channel_id"::text
        )
      )
    )
    FROM "metric_alert_rule_channels" marc
    WHERE marc."metric_alert_rule_id" = ${ruleId}
  `);
}
