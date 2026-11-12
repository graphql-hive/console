import { HiveError } from '../../../../shared/errors';
import { isUUID } from '../../../../shared/is-uuid';
import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const enableAlertChannel: NonNullable<MutationResolvers['enableAlertChannel']> = async (
  _,
  { input },
  { injector },
) => {
  if (!isUUID(input.channelId)) {
    return { error: { message: 'Alert channel not found or already enabled.' } };
  }

  try {
    const channel = await injector.get(AlertsManager).enableChannel({
      channelId: input.channelId,
    });

    return {
      ok: {
        enabledAlertChannel: channel,
      },
    };
  } catch (error) {
    if (error instanceof HiveError) {
      return {
        error: {
          message: error.message,
        },
      };
    }

    throw error;
  }
};
