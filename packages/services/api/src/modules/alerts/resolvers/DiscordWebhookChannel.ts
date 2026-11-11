import { alertChannelDeliveryResolvers } from '../lib/alert-channel-delivery-resolvers';
import { alertChannelDisabledBy } from '../lib/alert-channel-disabled-by-resolver';
import type { DiscordWebhookChannelResolvers } from './../../../__generated__/types';

export const DiscordWebhookChannel: DiscordWebhookChannelResolvers = {
  __isTypeOf: channel => {
    return channel.type === 'DISCORD';
  },
  endpoint: async channel => {
    return channel.webhookEndpoint ?? '';
  },
  deliveryStats: alertChannelDeliveryResolvers.deliveryStats,
  deliveryHealth: alertChannelDeliveryResolvers.deliveryHealth,
  deliveryLog: alertChannelDeliveryResolvers.deliveryLog,
  disabledBy: alertChannelDisabledBy,
};
