import { z } from 'zod';
import { psql } from '@hive/postgres';
import { env } from '../environment.js';
import { defineTask, implementTask } from '../kit.js';
import {
  evaluateRule,
  fetchEnabledRules,
  groupRulesByQuery,
  queryClickHouseWindows,
} from '../lib/metric-alert-evaluator.js';
import { sendMetricAlertNotifications } from '../lib/metric-alert-notifier.js';

export const EvaluateMetricAlertRulesTask = defineTask({
  name: 'evaluateMetricAlertRules',
  schema: z.unknown(),
});

export const task = implementTask(EvaluateMetricAlertRulesTask, async args => {
  const { context, logger } = args;

  if (!context.clickhouse) {
    logger.debug('ClickHouse not configured, skipping metric alert evaluation');
    return;
  }

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

  for (const [, groupRules] of groups) {
    const representative = groupRules[0];

    let windows;
    try {
      windows = await queryClickHouseWindows(
        context.clickhouse,
        representative.targetId,
        representative.timeWindowMinutes,
      );
    } catch (error) {
      logger.error(
        { error, targetId: representative.targetId },
        'Failed to query ClickHouse for alert evaluation',
      );
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

    // Fetch slugs for notification messages (once per group since all share a target)
    const slugs = (await context.pg.maybeOne(psql`
      SELECT
        o."slug" as "organizationSlug"
        , p."slug" as "projectSlug"
        , t."slug" as "targetSlug"
      FROM "targets" t
      INNER JOIN "projects" p ON p."id" = t."project_id"
      INNER JOIN "organizations" o ON o."id" = p."org_id"
      WHERE t."id" = ${representative.targetId}
    `)) as { organizationSlug: string; projectSlug: string; targetSlug: string } | null;

    for (const rule of groupRules) {
      await evaluateRule({
        rule,
        current,
        previous,
        pg: context.pg,
        logger,
        onTransition: async ({ rule: r, fromState, toState, currentValue, previousValue }) => {
          if (!slugs) return;

          const isFiring = toState === 'FIRING';
          const isResolved = fromState === 'RECOVERING' && toState === 'NORMAL';

          if (isFiring || isResolved) {
            await sendMetricAlertNotifications({
              ruleId: r.id,
              event: {
                state: isFiring ? 'firing' : 'resolved',
                rule: r,
                currentValue,
                previousValue,
                organizationSlug: slugs.organizationSlug,
                projectSlug: slugs.projectSlug,
                targetSlug: slugs.targetSlug,
              },
              pg: context.pg,
              requestBroker: context.requestBroker,
              logger,
            });
          }
        },
      });
    }
  }

  logger.info('Metric alert evaluation complete');
});
