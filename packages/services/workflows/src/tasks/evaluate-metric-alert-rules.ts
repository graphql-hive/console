import { z } from 'zod';
import { env } from '../environment.js';
import { defineTask, implementTask } from '../kit.js';
import {
  evaluateRule,
  fetchEnabledRules,
  groupRulesByQuery,
  queryClickHouseWindows,
} from '../lib/metric-alert-evaluator.js';

export const EvaluateMetricAlertRulesTask = defineTask({
  name: 'evaluateMetricAlertRules',
  schema: z.unknown(),
});

export const task = implementTask(EvaluateMetricAlertRulesTask, async args => {
  const { context, logger, helpers } = args;

  if (!context.clickhouse) {
    logger.debug('ClickHouse not configured, skipping metric alert evaluation');
    return;
  }

  // Anchor every evaluation in this run to the cron's scheduled time. If the
  // worker is backed up, wall-clock would shift queried windows past the
  // minute that should have fired the alert; run_at keeps results consistent
  // with the schedule. Falls back to wall-clock for ad-hoc / manually-queued
  // runs that have no scheduled time.
  const evaluationTime = helpers.job.run_at ?? new Date();

  // OR-style gate: when cluster flag is on, evaluate every rule; when off,
  // fetchEnabledRules filters to rules belonging to opted-in orgs only.
  const clusterFlagEnabled = env.featureFlags.metricAlertRulesEnabled;
  const rules = await fetchEnabledRules(context.pg, clusterFlagEnabled);

  if (rules.length === 0) {
    logger.debug('No enabled metric alert rules found');
    return;
  }

  logger.info({ count: rules.length }, 'Evaluating metric alert rules');

  const groups = groupRulesByQuery(rules);
  let groupsFailed = 0;

  for (const [, groupRules] of groups) {
    const representative = groupRules[0];

    let windows;
    try {
      windows = await queryClickHouseWindows(
        context.clickhouse,
        representative.targetId,
        representative.timeWindowMinutes,
        evaluationTime,
      );
    } catch (error) {
      logger.error(
        { error, targetId: representative.targetId },
        'Failed to query ClickHouse for alert evaluation',
      );
      groupsFailed++;
      continue;
    }

    // Treat a missing window as a zero-value window. Skipping evaluation
    // would leave BELOW-threshold alerts (e.g., "fire when traffic drops
    // below N") unable to fire when traffic drops to zero, and FIRING
    // rules whose target stops getting traffic stuck in FIRING forever.
    // With zeros, ABOVE thresholds correctly fall out of breach (so the
    // rule recovers) and BELOW thresholds correctly stay in breach (zero
    // is below any positive threshold). evaluateRule itself updates
    // last_evaluated_at, so the inline UPDATE loop is no longer needed.
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
    }

    for (const rule of groupRules) {
      await evaluateRule({
        rule,
        current,
        previous,
        pg: context.pg,
        logger,
        evaluationTime,
      });
    }
  }

  logger.info(
    { groupsAttempted: groups.size, groupsFailed },
    'Metric alert evaluation complete',
  );
});
