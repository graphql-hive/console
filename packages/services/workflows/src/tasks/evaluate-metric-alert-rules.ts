import pLimit from 'p-limit';
import { z } from 'zod';
import { psql } from '@hive/postgres';
import { SpanKind, SpanStatusCode, trace } from '@hive/service-common';
import { defineTask, implementTask } from '../kit.js';
import {
  evaluateRule,
  fetchEnabledRules,
  groupRulesByQuery,
  isFilteredFilter,
  isRuleDue,
  markRulesEvaluationBlocked,
  parseSavedFilter,
  queryClickHouseWindows,
  resolveSavedFilter,
  rulesNeedingBlockWrite,
  SAVED_FILTER_SKIP_REASONS,
  type ParsedSavedFilter,
  type SavedFilterSkipReason,
} from '../lib/metric-alert-evaluator.js';
import { createSupergraphOwnershipLoader } from '../lib/supergraph-ownership.js';
import {
  metricAlertEnabledRules,
  metricAlertGroupsSkipped,
  metricAlertRuleGroups,
} from '../metrics.js';

// How many groups to evaluate in parallel. Each group = 1 ClickHouse round-trip
// plus a per-rule state-machine evaluation that holds a Postgres connection for
// the duration of its transaction. Keep this comfortably below the PG pool size
// (slonik default 10) so transactions never starve.
const GROUP_CONCURRENCY = 5;

const tracer = trace.getTracer('metric-alert-evaluator');

export const EvaluateMetricAlertRulesTask = defineTask({
  name: 'evaluateMetricAlertRules',
  // A cron job's payload carries no `input`; under zod v4 an `unknown` key is still required.
  schema: z.unknown().optional(),
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
  const groups = groupRulesByQuery(rules);

  // Parse each group's saved filter once, reused by the gauges below and by
  // processGroup, so a filtered group isn't re-parsed within the same tick.
  const groupFilters = [...groups.values()].map(group => ({
    group,
    filter: parseSavedFilter(group[0].savedFilterFilters, logger),
  }));

  // Population gauges for the expensive with-filter rules. "Filtered" means the
  // filter narrows the query (the legacy-table path), not just that a
  // saved_filter_id is set. Both labels set each tick (incl. 0) to avoid staleness.
  let filteredGroups = 0;
  let filteredRules = 0;
  for (const { group, filter } of groupFilters) {
    if (isFilteredFilter(filter)) {
      filteredGroups += 1;
      filteredRules += group.length;
    }
  }
  metricAlertRuleGroups.set({ filtered: 'true' }, filteredGroups);
  metricAlertRuleGroups.set({ filtered: 'false' }, groups.size - filteredGroups);
  metricAlertEnabledRules.set({ filtered: 'true' }, filteredRules);
  metricAlertEnabledRules.set({ filtered: 'false' }, rules.length - filteredRules);

  if (rules.length === 0) {
    for (const reason of SAVED_FILTER_SKIP_REASONS) {
      metricAlertGroupsSkipped.set({ reason }, 0);
    }
    logger.debug('No enabled metric alert rules found');
    return;
  }

  logger.info({ count: rules.length }, 'Evaluating metric alert rules');

  // One loader per tick: concurrent groups on the same target share one version lookup.
  const ownership = createSupergraphOwnershipLoader(context.pg, logger);

  // Evaluate only groups with at least one due member. Members of a group share
  // a window (so one cadence), and the batched UPDATE below keeps their
  // last_evaluated_at aligned, so a group is due as a unit.
  const dueGroupList = groupFilters.filter(({ group }) =>
    group.some(rule => isRuleDue(rule, evaluationTime)),
  );

  if (dueGroupList.length === 0) {
    logger.debug(
      { evaluationTime: evaluationTime.toISOString(), groups: groups.size, rules: rules.length },
      'No metric alert rule groups are due this tick',
    );
    return;
  }

  async function processGroup(
    groupRules: (typeof rules)[number][],
    parsedFilter: ParsedSavedFilter,
  ): Promise<{
    failed: boolean;
    skipped: SavedFilterSkipReason | null;
    evaluatedIds: string[];
  }> {
    const representative = groupRules[0];

    // Only PERCENTAGE_CHANGE rules need the prior window; if none in the group do,
    // skip it (half the scan) and persist a null previousValue.
    const needsPreviousWindow = groupRules.some(r => r.thresholdType === 'PERCENTAGE_CHANGE');

    // Fetch a duration column only if a LATENCY rule needs it: percentiles for a
    // percentile metric, avg for AVG. Error/traffic groups fetch neither.
    const needsPercentiles = groupRules.some(r => r.type === 'LATENCY' && r.metric !== 'AVG');
    const needsAverage = groupRules.some(r => r.type === 'LATENCY' && r.metric === 'AVG');

    // Any TRAFFIC rule keeps the group on hourly at >= 7d (exact counts).
    const allowDailyRollup = !groupRules.some(r => r.type === 'TRAFFIC');

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
          // Rule intent, so a slow trace is findable in TraceQL without reading
          // db.query. filter.applied uses filterConditions (matching the gauge):
          // true only when the filter yields the heavier legacy-table query.
          'metric.types': [...new Set(groupRules.map(r => r.type))],
          'threshold.types': [...new Set(groupRules.map(r => r.thresholdType))],
          'filter.applied': isFilteredFilter(parsedFilter),
          'window.needs_previous': needsPreviousWindow,
          'metric.needs_percentiles': needsPercentiles,
        },
      },
      async span => {
        try {
          // Resolve subgraph names against the latest composable version before touching
          // ClickHouse. A filter that cannot be resolved skips the whole group: its rules keep
          // their state and `last_evaluated_at` stays put, so a FIRING rule stays FIRING with
          // no resolution and a PENDING one never fires until the filter is fixed. The rows'
          // evaluation_blocked_* columns tell the detail page why; the gauge and span attribute
          // tell operators. A skipped group is retried every tick, so the write and the warning
          // happen only when the reason changes, and the batched UPDATE below clears the block
          // once the group evaluates again.
          const resolution = await resolveSavedFilter(parsedFilter, {
            targetId: representative.targetId,
            ownership,
          });
          if (resolution.kind === 'skip') {
            span.setAttribute('filter.skipped_reason', resolution.reason);
            span.setStatus({ code: SpanStatusCode.ERROR, message: 'saved filter unresolvable' });
            const changed = rulesNeedingBlockWrite(groupRules, resolution);
            if (changed.length > 0) {
              await markRulesEvaluationBlocked(context.pg, {
                ruleIds: changed,
                reason: resolution.reason,
                details: resolution.details,
                since: evaluationTime,
              });
              logger.warn(
                {
                  targetId: representative.targetId,
                  savedFilterId: representative.savedFilterId,
                  ruleIds: changed,
                  reason: resolution.reason,
                  details: resolution.details,
                },
                'Skipping metric alert group: its saved filter cannot be resolved',
              );
            }
            return { failed: false, skipped: resolution.reason, evaluatedIds: [] };
          }

          let windows;
          try {
            windows = await queryClickHouseWindows(
              clickhouse,
              representative.targetId,
              representative.timeWindowMinutes,
              resolution.filter,
              evaluationTime,
              needsPreviousWindow,
              needsAverage,
              needsPercentiles,
              allowDailyRollup,
            );
          } catch (error) {
            logger.error(
              { error, targetId: representative.targetId },
              'Failed to query ClickHouse for alert evaluation',
            );
            span.setStatus({ code: SpanStatusCode.ERROR, message: 'clickhouse query failed' });
            span.setAttribute('error.type', error instanceof Error ? error.name : 'unknown');
            return { failed: true, skipped: null, evaluatedIds: [] };
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
            // Mirror the query's column selection (null when skipped) so requireColumn
            // still catches a select/read desync when there's no traffic.
            average: needsAverage ? 0 : null,
            percentiles: needsPercentiles
              ? ([0, 0, 0, 0] as [number, number, number, number])
              : null,
          };
          const current = windows.current ?? { window: 'current' as const, ...ZERO_WINDOW };
          // A skipped previous window stays null (not synthesized to zeros).
          const previous = needsPreviousWindow
            ? (windows.previous ?? { window: 'previous' as const, ...ZERO_WINDOW })
            : null;

          if (!windows.current || (needsPreviousWindow && !windows.previous)) {
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
          return { failed: false, skipped: null, evaluatedIds };
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
        'groups.due': dueGroupList.length,
        'rules.due': dueGroupList.reduce((total, { group }) => total + group.length, 0),
        'evaluation.time': evaluationTime.toISOString(),
      },
    },
    async span => {
      try {
        // Fixed-capacity pool: keep GROUP_CONCURRENCY groups in flight at once so
        // a slow group can't idle the other slots (a batch barrier would wait for
        // the whole batch before starting the next). allSettled so one thrown
        // group doesn't strand the rest; it re-evaluates on the next 60s tick,
        // not via graphile-worker retries that would re-run already-committed work.
        const limit = pLimit(GROUP_CONCURRENCY);
        let groupsFailed = 0;
        const skippedByReason = new Map<SavedFilterSkipReason, number>(
          SAVED_FILTER_SKIP_REASONS.map(reason => [reason, 0]),
        );
        const evaluatedRuleIds: string[] = [];
        const results = await Promise.allSettled(
          dueGroupList.map(({ group, filter }) => limit(() => processGroup(group, filter))),
        );
        for (const r of results) {
          if (r.status === 'rejected') {
            groupsFailed++;
            logger.error({ error: r.reason }, 'Group evaluation threw unexpectedly');
          } else if (r.value.failed) {
            groupsFailed++;
          } else if (r.value.skipped) {
            skippedByReason.set(r.value.skipped, (skippedByReason.get(r.value.skipped) ?? 0) + 1);
          } else {
            evaluatedRuleIds.push(...r.value.evaluatedIds);
          }
        }
        // Every reason is set each tick (incl. 0) so a fixed filter clears the gauge.
        let groupsSkipped = 0;
        for (const [reason, count] of skippedByReason) {
          metricAlertGroupsSkipped.set({ reason }, count);
          groupsSkipped += count;
        }

        // One batched UPDATE for all successfully-evaluated rules'
        // last_evaluated_at, replacing what used to be N per-rule UPDATEs
        // inside evaluateRule. All rules evaluated in this tick share the
        // same scheduled evaluationTime, which is more correct than NOW()
        // (which would drift across the tick). An evaluated rule is by definition
        // not blocked any more, so the same statement clears its block.
        if (evaluatedRuleIds.length > 0) {
          await context.pg.query(psql`
            UPDATE "metric_alert_rules"
            SET
              "last_evaluated_at" = ${evaluationTime.toISOString()}
              , "evaluation_blocked_reason" = NULL
              , "evaluation_blocked_since" = NULL
              , "evaluation_blocked_details" = NULL
            WHERE "id" = ANY(${psql.array(evaluatedRuleIds, 'uuid')})
          `);
        }

        span.setAttributes({
          'groups.failed': groupsFailed,
          'groups.skipped': groupsSkipped,
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
            groupsAttempted: dueGroupList.length,
            groupsFailed,
            groupsSkipped,
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
