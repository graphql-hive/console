import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { MetricAlertRuleIncidentResolvers } from './../../../__generated__/types';

export const MetricAlertRuleIncident: MetricAlertRuleIncidentResolvers = {
  stateLog: (incident, _, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getStateLogByIncident({
      incidentId: incident.id,
    });
  },
};
