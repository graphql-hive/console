import { TargetManager } from '../../target/providers/target-manager';
import { AlertsManager } from '../providers/alerts-manager';
import type { AlertResolvers } from './../../../__generated__/types';

export const Alert: AlertResolvers = {
  channel: async (alert, _, { injector }) => {
    const channels = await injector.get(AlertsManager).getChannels({
      organizationId: alert.organizationId,
      projectId: alert.projectId,
    });

    return channels.find(c => c.id === alert.channelId)!;
  },
  target: (alert, _, { injector }) => {
    return injector.get(TargetManager).getTarget({
      organizationId: alert.organizationId,
      projectId: alert.projectId,
      targetId: alert.targetId,
    });
  },
};
