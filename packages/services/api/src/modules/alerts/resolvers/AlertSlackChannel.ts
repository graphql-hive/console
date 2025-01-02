import type { AlertSlackChannelResolvers } from './../../../__generated__/types';

export const AlertSlackChannel: AlertSlackChannelResolvers = {
  __isTypeOf: channel => {
    return channel.type === 'SLACK';
  },
  channel: channel => {
    return channel.slackChannel!;
  },
};
