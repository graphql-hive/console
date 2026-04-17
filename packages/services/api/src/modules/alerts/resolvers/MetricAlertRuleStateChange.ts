import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { MetricAlertRuleStateChangeResolvers } from './../../../__generated__/types';

export const MetricAlertRuleStateChange: MetricAlertRuleStateChangeResolvers = {
  rule: async (entry, _, { injector }) => {
    const rule = await injector
      .get(MetricAlertRulesStorage)
      .getMetricAlertRule({ id: entry.metricAlertRuleId });

    if (!rule) {
      throw new Error(`Metric alert rule ${entry.metricAlertRuleId} not found`);
    }

    return rule;
  },
};
