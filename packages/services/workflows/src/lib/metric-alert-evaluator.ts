import type { Logger } from '@graphql-hive/logger';
import type { CommonQueryMethods, PostgresDatabasePool } from '@hive/postgres';
import { psql } from '@hive/postgres';
import { metricAlertClickHouseQueryDuration } from '../metrics.js';
import type { ClickHouseClient } from './clickhouse-client.js';

export type MetricAlertRuleRow = {
  id: string;
  organizationId: string;
  projectId: string;
  targetId: string;
  name: string;
  type: 'LATENCY' | 'ERROR_RATE' | 'TRAFFIC';
  timeWindowMinutes: number;
  metric: 'AVG' | 'P75' | 'P90' | 'P95' | 'P99' | null;
  thresholdType: 'FIXED_VALUE' | 'PERCENTAGE_CHANGE';
  thresholdValue: number;
  direction: 'ABOVE' | 'BELOW';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  state: 'NORMAL' | 'PENDING' | 'FIRING' | 'RECOVERING';
  stateChangedAt: string | null;
  confirmationMinutes: number;
  savedFilterId: string | null;
  /** Plan name of the rule's organization. Drives state-log retention. */
  organizationPlanName: string | null;
};

type ClickHouseWindowRow = {
  window: 'current' | 'previous';
  total: string;
  total_ok: string;
  average: number;
  percentiles: [number, number, number, number];
};

type GroupKey = string;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUUID(value: string): string {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid UUID: ${value}`);
  }
  return value;
}

function makeGroupKey(rule: MetricAlertRuleRow): GroupKey {
  return `${rule.targetId}:${rule.timeWindowMinutes}:${rule.savedFilterId ?? ''}`;
}

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
      return metricMap[rule.metric!] ?? 0;
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

function hasElapsed(stateChangedAt: string | null, minutes: number): boolean {
  if (!stateChangedAt) return true;
  const changedAt = new Date(stateChangedAt).getTime();
  return Date.now() - changedAt >= minutes * 60_000;
}

export async function fetchEnabledRules(
  pg: PostgresDatabasePool,
  clusterFlagEnabled: boolean,
): Promise<MetricAlertRuleRow[]> {
  // OR-style feature gate: when the cluster env-var is on, evaluate every
  // enabled rule. When it's off, only evaluate rules whose organization has
  // opted in via the per-org JSONB feature flag. Mirrors the resolver-side
  // OR gate at alerts/resolvers/Target.ts.
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
      , o."plan_name" as "organizationPlanName"
    FROM "metric_alert_rules" r
    INNER JOIN "organizations" o ON o."id" = r."organization_id"
    WHERE r."enabled" = true
      ${
        clusterFlagEnabled
          ? psql``
          : psql`AND COALESCE((o."feature_flags"->>'metricAlertRules')::boolean, false) IS TRUE`
      }
  `);

  return result as unknown as MetricAlertRuleRow[];
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

export async function queryClickHouseWindows(
  clickhouse: ClickHouseClient,
  targetId: string,
  timeWindowMinutes: number,
): Promise<{ current: ClickHouseWindowRow | null; previous: ClickHouseWindowRow | null }> {
  const now = Date.now();
  const offsetMs = 60_000;
  const windowMs = timeWindowMinutes * 60_000;

  const currentWindowEnd = new Date(now - offsetMs);
  const currentWindowStart = new Date(now - offsetMs - windowMs);
  const previousWindowStart = new Date(now - offsetMs - 2 * windowMs);

  const tableName = timeWindowMinutes <= 360 ? 'operations_minutely' : 'operations_hourly';

  const safeTargetId = assertUUID(targetId);

  // ClickHouse parameterized query syntax is not supported via the HTTP interface
  // in the same way as PostgreSQL. We validate the UUID format above to prevent injection.
  const sql = `
    SELECT
      CASE
        WHEN timestamp >= fromUnixTimestamp64Milli(${currentWindowStart.getTime()}) THEN 'current'
        ELSE 'previous'
      END as window,
      sum(total) as total,
      sum(total_ok) as total_ok,
      avgMerge(duration_avg) as average,
      quantilesMerge(0.75, 0.90, 0.95, 0.99)(duration_quantiles) as percentiles
    FROM ${tableName}
    WHERE target = '${safeTargetId}'
      AND timestamp >= fromUnixTimestamp64Milli(${previousWindowStart.getTime()})
      AND timestamp < fromUnixTimestamp64Milli(${currentWindowEnd.getTime()})
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
    rows = await clickhouse.query<ClickHouseWindowRow>(sql);
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
}): Promise<void> {
  const { rule, current, previous, pg, logger } = args;
  const now = new Date();

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
          );
        });
        logger.info({ ruleId: rule.id }, 'Alert rule entered PENDING state');
        break;
      }
      case 'PENDING': {
        if (
          rule.confirmationMinutes === 0 ||
          hasElapsed(rule.stateChangedAt, rule.confirmationMinutes)
        ) {
          await pg.transaction('alertEval:pendingToFiring', async trx => {
            await updateState(trx, rule.id, 'FIRING', now, now);
            const stateLogId = await logTransition(
              trx,
              rule,
              'PENDING',
              'FIRING',
              currentValue,
              previousValue,
              retentionDays,
            );
            await trx.query(psql`
              INSERT INTO "metric_alert_incidents" (
                "metric_alert_rule_id", "current_value", "previous_value", "threshold_value"
              ) VALUES (
                ${rule.id}, ${currentValue}, ${previousValue}, ${rule.thresholdValue}
              )
            `);
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
          await logTransition(
            trx,
            rule,
            'RECOVERING',
            'FIRING',
            currentValue,
            previousValue,
            retentionDays,
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
          await logTransition(
            trx,
            rule,
            'FIRING',
            'RECOVERING',
            currentValue,
            previousValue,
            retentionDays,
          );
        });
        logger.info({ ruleId: rule.id }, 'Alert rule entered RECOVERING state');
        break;
      }
      case 'RECOVERING': {
        if (
          rule.confirmationMinutes === 0 ||
          hasElapsed(rule.stateChangedAt, rule.confirmationMinutes)
        ) {
          await pg.transaction('alertEval:recoveringToNormal', async trx => {
            await updateState(trx, rule.id, 'NORMAL', now);
            const stateLogId = await logTransition(
              trx,
              rule,
              'RECOVERING',
              'NORMAL',
              currentValue,
              previousValue,
              retentionDays,
            );
            await trx.query(psql`
              UPDATE "metric_alert_incidents"
              SET "resolved_at" = NOW()
              WHERE "metric_alert_rule_id" = ${rule.id} AND "resolved_at" IS NULL
            `);
            await enqueueChannelNotifications(trx, rule.id, stateLogId);
          });
          logger.info({ ruleId: rule.id }, 'Alert rule resolved, back to NORMAL');
        }
        break;
      }
    }
  }

  // Single-statement housekeeping; doesn't need to share a transaction with
  // the state-machine writes above.
  await pg.query(psql`
    UPDATE "metric_alert_rules"
    SET "last_evaluated_at" = NOW(), "updated_at" = NOW()
    WHERE "id" = ${rule.id}
  `);
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
): Promise<string> {
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  const id = await conn.oneFirst(psql`
    INSERT INTO "metric_alert_state_log" (
      "metric_alert_rule_id"
      , "target_id"
      , "from_state"
      , "to_state"
      , "value"
      , "previous_value"
      , "threshold_value"
      , "expires_at"
    ) VALUES (
      ${rule.id}
      , ${rule.targetId}
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
