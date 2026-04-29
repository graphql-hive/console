import { METRIC_ALERT_RULES_ENABLED } from '../providers/metric-alert-rules-flag-token';
import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'metricAlertRule'
  | 'metricAlertRuleStateLog'
  | 'metricAlertRules'
  | 'viewerCanUseMetricAlertRules'
> = {
  metricAlertRules: (target, _, { injector }) => {
    if (injector.get<boolean>(METRIC_ALERT_RULES_ENABLED) === false) {
      return [];
    }
    return injector.get(MetricAlertRulesStorage).getMetricAlertRulesByTarget({
      targetId: target.id,
    });
  },
  metricAlertRule: async (target, { id }, { injector }) => {
    if (injector.get<boolean>(METRIC_ALERT_RULES_ENABLED) === false) {
      return null;
    }
    const rule = await injector.get(MetricAlertRulesStorage).getMetricAlertRule({ id });
    if (!rule || rule.targetId !== target.id) {
      return null;
    }
    return rule;
  },
  metricAlertRuleStateLog: (target, { from, to }, { injector }) => {
    if (injector.get<boolean>(METRIC_ALERT_RULES_ENABLED) === false) {
      return [];
    }
    return injector.get(MetricAlertRulesStorage).getStateLogByTarget({
      targetId: target.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
  viewerCanUseMetricAlertRules: (_target, _args, { injector }) => {
    return injector.get<boolean>(METRIC_ALERT_RULES_ENABLED);
  },
};
