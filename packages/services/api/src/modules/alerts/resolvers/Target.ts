import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<TargetResolvers, 'metricAlertRuleStateLog'> = {
  metricAlertRuleStateLog: (target, { from, to }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getStateLogByTarget({
      targetId: target.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
};
