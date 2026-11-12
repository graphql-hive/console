import { Storage } from '../../shared/providers/storage';
import type { AlertSlackChannelResolvers } from './../../../__generated__/types';

/**
 * The member who disabled the channel, shared by the four concrete `AlertChannel` types. Null
 * while the channel is enabled, and when Hive disabled it for failing.
 */
export const alertChannelDisabledBy: NonNullable<AlertSlackChannelResolvers['disabledBy']> = (
  channel,
  _,
  { injector },
) => {
  if (!channel.disabledByUserId) {
    return null;
  }
  return injector.get(Storage).getUserById({ id: channel.disabledByUserId });
};
