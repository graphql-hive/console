import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  'metricAlertRule' | 'metricAlertRuleStateLog' | 'metricAlertRules'
> = {
  metricAlertRules: (target, _, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getMetricAlertRulesByTarget({
      targetId: target.id,
    });
  },
  metricAlertRule: async (target, { id }, { injector }) => {
    const rule = await injector.get(MetricAlertRulesStorage).getMetricAlertRule({ id });
    if (!rule || rule.targetId !== target.id) {
      return null;
    }
    return rule;
  },
  metricAlertRuleStateLog: (target, { from, to }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getStateLogByTarget({
      targetId: target.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
};
