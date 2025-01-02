import { AlertsManager } from '../providers/alerts-manager';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<ProjectResolvers, 'alertChannels' | 'alerts' | '__isTypeOf'> = {
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
};
