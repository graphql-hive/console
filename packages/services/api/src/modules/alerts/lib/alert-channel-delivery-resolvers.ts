import { parseDateRangeInput } from '../../../shared/helpers';
import { AlertsManager } from '../providers/alerts-manager';
import type { AlertSlackChannelResolvers } from './../../../__generated__/types';

/**
 * Delivery fields shared by the four concrete `AlertChannel` types. The parent carries the
 * organization it was reached through, which the manager needs to authorize the read.
 */
export const alertChannelDeliveryResolvers: Pick<
  AlertSlackChannelResolvers,
  'deliveryStats' | 'deliveryHealth' | 'deliveryLog'
> = {
  // Only a selection; the AlertChannelDeliveryStats fields query and authorize.
  deliveryStats: (channel, { period }) => ({
    organizationId: channel.organizationId,
    projectId: channel.projectId,
    channelId: channel.id,
    period: parseDateRangeInput(period),
  }),
  deliveryHealth: (channel, _, { injector }) =>
    injector.get(AlertsManager).getChannelDeliveryHealth({
      organizationId: channel.organizationId,
      projectId: channel.projectId,
      channelId: channel.id,
    }),
  deliveryLog: (channel, { period, limit }, { injector }) =>
    injector.get(AlertsManager).getChannelDeliveryLog({
      organizationId: channel.organizationId,
      projectId: channel.projectId,
      channelId: channel.id,
      period: parseDateRangeInput(period),
      limit: limit ?? undefined,
    }),
};
