import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const enableAlertChannel: NonNullable<MutationResolvers['enableAlertChannel']> = async (
  _,
  { input },
  { injector },
) => {
  const channel = await injector.get(AlertsManager).enableChannel({ channelId: input.channelId });
  if (!channel) {
    return { error: { message: 'Alert channel not found or already enabled.' } };
  }
  return { ok: { enabledAlertChannel: channel } };
};
