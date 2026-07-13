import type { DiscordWebhookChannelResolvers } from './../../../__generated__/types';

export const DiscordWebhookChannel: DiscordWebhookChannelResolvers = {
  __isTypeOf: channel => {
    return channel.type === 'DISCORD';
  },
  endpoint: async channel => {
    return channel.webhookEndpoint ?? '';
  },
};
