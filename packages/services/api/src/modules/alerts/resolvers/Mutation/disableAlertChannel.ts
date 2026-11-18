import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const disableAlertChannel: NonNullable<MutationResolvers['disableAlertChannel']> = async (
  _,
  { input },
  { injector },
) => {
  const channel = await injector.get(AlertsManager).disableChannel({ channelId: input.channelId });
  if (!channel) {
    return { error: { message: 'Alert channel not found or already disabled.' } };
  }
  return { ok: { disabledAlertChannel: channel } };
};
