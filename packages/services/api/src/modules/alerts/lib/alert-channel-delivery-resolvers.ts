import type { AlertChannelMapper } from '../module.graphql.mappers';
import { parseDateRangeInput } from '../../../shared/helpers';
import {
  AlertsManager,
  channelDeliverySelector,
  type ChannelDeliveryRef,
} from '../providers/alerts-manager';
import type { AlertSlackChannelResolvers } from './../../../__generated__/types';

function channelRef(channel: AlertChannelMapper): ChannelDeliveryRef {
  return {
    organizationId: channel.organizationId,
    projectId: channel.projectId,
    channelId: channel.id,
    channelType: channel.type,
  };
}

/**
 * Delivery fields shared by the four concrete `AlertChannel` types. The parent carries the
 * organization it was reached through, which the manager needs to authorize the read.
 */
export const alertChannelDeliveryResolvers: Pick<
  AlertSlackChannelResolvers,
  'deliveryStats' | 'deliveryHealth' | 'deliveryLog'
> = {
  // Authorized here once; the DeliveryStats fields then read for the selection.
  deliveryStats: async (channel, { period }, { injector }) => {
    const ref = channelRef(channel);
    await injector.get(AlertsManager).assertCanReadChannelDeliveries(ref);
    return { selector: channelDeliverySelector(ref), period: parseDateRangeInput(period) };
  },
  deliveryHealth: (channel, _, { injector }) =>
    injector.get(AlertsManager).getChannelDeliveryHealth(channelRef(channel)),
  deliveryLog: (channel, { period, limit }, { injector }) =>
    injector.get(AlertsManager).getChannelDeliveryLog({
      ...channelRef(channel),
      period: parseDateRangeInput(period),
      limit: limit ?? undefined,
    }),
};
