import { alertChannelDeliveryResolvers } from '../lib/alert-channel-delivery-resolvers';
import type { AlertWebhookChannelResolvers } from './../../../__generated__/types';

export const AlertWebhookChannel: AlertWebhookChannelResolvers = {
  __isTypeOf: channel => {
    return channel.type === 'WEBHOOK';
  },
  endpoint: async channel => {
    return channel.webhookEndpoint!;
  },
  deliveryStats: alertChannelDeliveryResolvers.deliveryStats,
  deliveryHealth: alertChannelDeliveryResolvers.deliveryHealth,
  deliveryLog: alertChannelDeliveryResolvers.deliveryLog,
};
