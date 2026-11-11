import { z } from 'zod';
import { HiveError } from '../../../../shared/errors';
import { isUUID } from '../../../../shared/is-uuid';
import { IdTranslator } from '../../../shared/providers/id-translator';
import {
  AlertChannelNameModel,
  SlackChannelNameModel,
  WebhookEndpointModel,
} from '../../lib/alert-channel-input';
import { AlertChannelDestinationError, AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

const UpdateAlertChannelModel = z.object({
  name: AlertChannelNameModel.nullish(),
  slack: z.object({ channel: SlackChannelNameModel }).nullish(),
  webhook: z.object({ endpoint: WebhookEndpointModel }).nullish(),
});

const NOT_FOUND = { message: 'Alert channel not found.', inputErrors: {} };

export const updateAlertChannel: NonNullable<MutationResolvers['updateAlertChannel']> = async (
  _,
  { input },
  { injector },
) => {
  const result = UpdateAlertChannelModel.safeParse(input);
  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;
    return {
      error: {
        message: 'Please check your input.',
        inputErrors: {
          name: errors.name?.[0],
          slackChannel: errors.slack?.[0],
          webhookEndpoint: errors.webhook?.[0],
        },
      },
    };
  }
  if (!isUUID(input.channelId)) {
    return { error: NOT_FOUND };
  }

  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
  ]);

  try {
    const channel = await injector.get(AlertsManager).updateChannel({
      organizationId,
      projectId,
      channelId: input.channelId,
      name: input.name ?? null,
      slackChannel: input.slack?.channel ?? null,
      webhookEndpoint: input.webhook?.endpoint ?? null,
    });
    if (!channel) {
      return { error: NOT_FOUND };
    }
    return { ok: { updatedAlertChannel: { ...channel, organizationId } } };
  } catch (error) {
    if (error instanceof AlertChannelDestinationError) {
      return {
        error: {
          message: 'Please check your input.',
          inputErrors: { [error.field]: error.message },
        },
      };
    }
    if (error instanceof HiveError) {
      return { error: { message: error.message, inputErrors: {} } };
    }
    throw error;
  }
};
