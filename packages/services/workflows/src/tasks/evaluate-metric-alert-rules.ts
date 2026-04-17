import { z } from 'zod';
import { psql } from '@hive/postgres';
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
  const { context, logger } = args;

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

    for (const rule of groupRules) {
      await evaluateRule({
        rule,
        current: windows.current,
        previous: windows.previous,
        pg: context.pg,
        logger,
      });
    }
  }

  logger.info('Metric alert evaluation complete');
});
