import { AlertsManager } from '../providers/alerts-manager';
import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<ProjectResolvers, 'alertChannels' | 'alerts' | 'metricAlertRules'> = {
  alerts: async (project, _, { injector }) => {
    return injector.get(AlertsManager).getAlerts({
      organizationId: project.orgId,
      projectId: project.id,
    });
  },
  alertChannels: async (project, _, { injector }) => {
    return injector.get(AlertsManager).getChannels({
      organizationId: project.orgId,
      projectId: project.id,
    });
  },
  metricAlertRules: async (project, _, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getMetricAlertRules({
      projectId: project.id,
    });
  },
};
