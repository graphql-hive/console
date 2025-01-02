import type { TeamsWebhookChannelResolvers } from './../../../__generated__/types';

export const TeamsWebhookChannel: TeamsWebhookChannelResolvers = {
  __isTypeOf: channel => {
    return channel.type === 'MSTEAMS_WEBHOOK';
  },
  endpoint: async channel => {
    return channel.webhookEndpoint!;
  },
};
