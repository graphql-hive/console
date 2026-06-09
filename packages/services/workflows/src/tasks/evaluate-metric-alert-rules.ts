import { z } from 'zod';
import { psql } from '@hive/postgres';
import { SpanKind, SpanStatusCode, trace } from '@hive/service-common';
import { defineTask, implementTask } from '../kit.js';
import {
  buildSavedFilterConditions,
  evaluateRule,
  fetchEnabledRules,
  groupRulesByQuery,
  queryClickHouseWindows,
} from '../lib/metric-alert-evaluator.js';

// How many groups to evaluate in parallel. Each group = 1 ClickHouse round-trip
// plus a per-rule state-machine evaluation that holds a Postgres connection for
// the duration of its transaction. Keep this comfortably below the PG pool size
// (slonik default 10) so transactions never starve.
const GROUP_CONCURRENCY = 5;

const tracer = trace.getTracer('metric-alert-evaluator');

export const EvaluateMetricAlertRulesTask = defineTask({
  name: 'evaluateMetricAlertRules',
  schema: z.unknown(),
});

export const task = implementTask(EvaluateMetricAlertRulesTask, async args => {
  const { context, logger, helpers } = args;

  // Defensive — the cron line for this task is only registered when
  // ClickHouse is configured (see workflows index.ts crontab construction),
  // so this branch should be unreachable in normal operation. The throw
  // exists to surface the misconfiguration loudly if someone manually
  // queues the task without ClickHouse, instead of silently returning.
  if (!context.clickhouse) {
    throw new Error(
      'evaluateMetricAlertRules was invoked but ClickHouse is not configured. ' +
        'Set CLICKHOUSE=1 and the CLICKHOUSE_* env vars to enable.',
    );
  }
  const clickhouse = context.clickhouse;

  // Anchor every evaluation in this run to the cron's scheduled time. If the
  // worker is backed up, wall-clock would shift queried windows past the
  // minute that should have fired the alert; run_at keeps results consistent
  // with the schedule. Falls back to wall-clock for ad-hoc / manually-queued
  // runs that have no scheduled time.
  //
  // `helpers.job.run_at` is typed as Date but arrives as an ISO string at
  // runtime — graphile-worker JSON-serializes job rows out of PG and never
  // hydrates the timestamp back into a Date. Wrap defensively so downstream
  // `.getTime()` calls work regardless of what shape we got.
  const rawRunAt = helpers.job.run_at;
  const evaluationTime =
    rawRunAt instanceof Date ? rawRunAt : rawRunAt ? new Date(rawRunAt) : new Date();

  // Evaluate every enabled rule. The org feature flag gates rule creation in
  // the API, not evaluation here; the per-rule `enabled` column is the gate.
  const rules = await fetchEnabledRules(context.pg);

  if (rules.length === 0) {
    logger.debug('No enabled metric alert rules found');
    return;
  }

  logger.info({ count: rules.length }, 'Evaluating metric alert rules');

  const groups = groupRulesByQuery(rules);
  const groupList = [...groups.values()];

  async function processGroup(groupRules: (typeof rules)[number][]): Promise<{
    failed: boolean;
    evaluatedIds: string[];
  }> {
    const representative = groupRules[0];

    // All rules in a group share the same saved filter (it's part of the group key),
    // so build the ClickHouse conditions once from the representative.
    // A malformed filter yields no conditions (evaluates unfiltered) and is logged,
    // isolating the failure to this group.
    const filterConditions = buildSavedFilterConditions(representative.savedFilterFilters, logger);

    // Only unfiltered groups can use the target-keyed rollups — they've dropped
    // the hash/client dimensions, so a saved filter would have nothing to
    // predicate on. Filtered groups keep their fast index-prefix path on the
    // legacy tables.
    const useTargetRollup = filterConditions.length === 0;

    // startActiveSpan makes this span the current OTel context for the
    // duration of the callback, so the slonik PG interceptor and the
    // fetch instrumentation parent their auto-spans under this one. That's
    // what makes the flame chart show CH query + per-rule PG transactions
    // nested under each group span.
    return tracer.startActiveSpan(
      'evaluate-group',
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'target.id': representative.targetId,
          'rules.in_group': groupRules.length,
          time_window_minutes: representative.timeWindowMinutes,
        },
      },
      async span => {
        try {
          let windows;
          try {
            windows = await queryClickHouseWindows(
              clickhouse,
              representative.targetId,
              representative.timeWindowMinutes,
              filterConditions,
              evaluationTime,
              useTargetRollup,
            );
          } catch (error) {
            logger.error(
              { error, targetId: representative.targetId },
              'Failed to query ClickHouse for alert evaluation',
            );
            span.setStatus({ code: SpanStatusCode.ERROR, message: 'clickhouse query failed' });
            span.setAttribute('error.type', error instanceof Error ? error.name : 'unknown');
            return { failed: true, evaluatedIds: [] };
          }

          // Treat a missing window as a zero-value window. Skipping evaluation
          // would leave BELOW-threshold alerts (e.g., "fire when traffic drops
          // below N") unable to fire when traffic drops to zero, and FIRING
          // rules whose target stops getting traffic stuck in FIRING forever.
          // With zeros, ABOVE thresholds correctly fall out of breach (so the
          // rule recovers) and BELOW thresholds correctly stay in breach (zero
          // is below any positive threshold).
          const ZERO_WINDOW = {
            total: '0',
            total_ok: '0',
            average: 0,
            percentiles: [0, 0, 0, 0] as [number, number, number, number],
          };
          const current = windows.current ?? { window: 'current' as const, ...ZERO_WINDOW };
          const previous = windows.previous ?? { window: 'previous' as const, ...ZERO_WINDOW };

          if (!windows.current || !windows.previous) {
            logger.debug(
              { targetId: representative.targetId },
              'No traffic in window(s), evaluating against zeros',
            );
            span.setAttribute('windows.synthesized', true);
          }

          const evaluatedIds: string[] = [];
          for (const rule of groupRules) {
            await evaluateRule({
              rule,
              current,
              previous,
              pg: context.pg,
              logger,
              evaluationTime,
            });
            evaluatedIds.push(rule.id);
          }
          return { failed: false, evaluatedIds };
        } finally {
          span.end();
        }
      },
    );
  }

  // Wrap the rest of the tick in a parent span so every evaluate-group, every
  // per-rule PG transaction, and every outbound CH/HTTP call gets parented
  // under this single root. The flame chart for the tick then visualizes the
  // whole evaluator run end-to-end.
  await tracer.startActiveSpan(
    'evaluate-metric-alert-rules',
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'rules.count': rules.length,
        'groups.count': groups.size,
        'evaluation.time': evaluationTime.toISOString(),
      },
    },
    async span => {
      try {
        // Bounded parallelism over groups: each group = 1 CH query + per-rule
        // state writes. allSettled (not Promise.all) so that one unexpected
        // throw inside evaluateRule doesn't strand the rest of the batch's
        // successful work; the throwing group's rules get re-evaluated on the
        // next cron tick (60s) rather than via graphile-worker retries, which
        // would otherwise re-run work that's already idempotently committed.
        // With GROUP_CONCURRENCY=5 we cut wall-clock per tick by up to 5x
        // without exhausting the PG pool.
        let groupsFailed = 0;
        const evaluatedRuleIds: string[] = [];
        for (let i = 0; i < groupList.length; i += GROUP_CONCURRENCY) {
          const batch = groupList.slice(i, i + GROUP_CONCURRENCY);
          const results = await Promise.allSettled(batch.map(processGroup));
          for (const r of results) {
            if (r.status === 'rejected') {
              groupsFailed++;
              logger.error({ error: r.reason }, 'Group evaluation threw unexpectedly');
            } else if (r.value.failed) {
              groupsFailed++;
            } else {
              evaluatedRuleIds.push(...r.value.evaluatedIds);
            }
          }
        }

        // One batched UPDATE for all successfully-evaluated rules'
        // last_evaluated_at, replacing what used to be N per-rule UPDATEs
        // inside evaluateRule. All rules evaluated in this tick share the
        // same scheduled evaluationTime, which is more correct than NOW()
        // (which would drift across the tick).
        if (evaluatedRuleIds.length > 0) {
          await context.pg.query(psql`
            UPDATE "metric_alert_rules"
            SET "last_evaluated_at" = ${evaluationTime.toISOString()}
            WHERE "id" = ANY(${psql.array(evaluatedRuleIds, 'uuid')})
          `);
        }

        span.setAttributes({
          'groups.failed': groupsFailed,
          'rules.evaluated': evaluatedRuleIds.length,
        });
        if (groupsFailed > 0) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `${groupsFailed} group(s) failed`,
          });
        }

        logger.info(
          {
            groupsAttempted: groups.size,
            groupsFailed,
            rulesEvaluated: evaluatedRuleIds.length,
          },
          'Metric alert evaluation complete',
        );
      } finally {
        span.end();
      }
    },
  );
});
