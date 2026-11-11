import { HiveError } from '../../../../shared/errors';
import { isUUID } from '../../../../shared/is-uuid';
import { IdTranslator } from '../../../shared/providers/id-translator';
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

  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
  ]);

  try {
    const channel = await injector.get(AlertsManager).enableChannel({
      organizationId,
      projectId,
      channelId: input.channelId,
    });

    return {
      ok: {
        enabledAlertChannel: { ...channel, organizationId },
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
