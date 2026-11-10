import { alertChannelDeliveryResolvers } from '../lib/alert-channel-delivery-resolvers';
import type { AlertSlackChannelResolvers } from './../../../__generated__/types';

export const AlertSlackChannel: AlertSlackChannelResolvers = {
  __isTypeOf: channel => {
    return channel.type === 'SLACK';
  },
  channel: channel => {
    return channel.slackChannel!;
  },
  deliveryStats: alertChannelDeliveryResolvers.deliveryStats,
  deliveryHealth: alertChannelDeliveryResolvers.deliveryHealth,
  deliveryLog: alertChannelDeliveryResolvers.deliveryLog,
};
