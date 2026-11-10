import { AlertsManager } from '../providers/alerts-manager';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<ProjectResolvers, 'alertChannel' | 'alertChannels' | 'alerts'> = {
  alerts: async (project, _, { injector }) => {
    return injector.get(AlertsManager).getAlerts({
      organizationId: project.orgId,
      projectId: project.id,
    });
  },
  alertChannels: async (project, _, { injector }) => {
    const channels = await injector.get(AlertsManager).getChannels({
      organizationId: project.orgId,
      projectId: project.id,
    });
    return channels.map(channel => ({ ...channel, organizationId: project.orgId }));
  },
  alertChannel: async (project, { id }, { injector }) => {
    const channel = await injector.get(AlertsManager).getChannel({
      organizationId: project.orgId,
      projectId: project.id,
      channelId: id,
    });
    return channel ? { ...channel, organizationId: project.orgId } : null;
  },
};
