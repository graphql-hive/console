import type { DiscordWebhookChannelResolvers } from './../../../__generated__/types';

export const DiscordWebhookChannel: DiscordWebhookChannelResolvers = {
  __isTypeOf: channel => {
    return channel.type === 'DISCORD_WEBHOOK';
  },
  endpoint: async channel => {
    return channel.webhookEndpoint ?? '';
  },
};
