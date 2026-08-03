import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { MetricAlertRuleStateChangeResolvers } from './../../../__generated__/types';

export const MetricAlertRuleStateChange: MetricAlertRuleStateChangeResolvers = {
  // Returns null when the parent rule has been deleted between fetching the
  // state-log row and resolving this field. The cascade on `metric_alert_state_log
  // ... ON DELETE CASCADE` makes this rare in practice, but it CAN happen during
  // a concurrent delete. The schema is `rule: MetricAlertRule` (nullable);
  // frontend list views filter null rules at render time so a transient miss
  // doesn't fail the whole response.
  rule: async (entry, _, { injector }) => {
    return injector
      .get(MetricAlertRulesStorage)
      .getMetricAlertRule({ id: entry.metricAlertRuleId });
  },
};
