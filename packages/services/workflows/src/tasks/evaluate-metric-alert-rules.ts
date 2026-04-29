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

  if (!env.featureFlags.metricAlertRulesEnabled) {
    logger.debug('Metric alert rules feature flag disabled, skipping evaluation');
    return;
  }

  if (!context.clickhouse) {
    logger.debug('ClickHouse not configured, skipping metric alert evaluation');
    return;
  }

  const rules = await fetchEnabledRules(context.pg);

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

    if (!windows.current || !windows.previous) {
      logger.debug(
        { targetId: representative.targetId },
        'Insufficient data for evaluation (need both current and previous windows)',
      );
      for (const rule of groupRules) {
        await context.pg.query(psql`
          UPDATE "metric_alert_rules"
          SET "last_evaluated_at" = NOW(), "updated_at" = NOW()
          WHERE "id" = ${rule.id}
        `);
      }
      continue;
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
        current: windows.current,
        previous: windows.previous,
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
