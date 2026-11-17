import { z } from 'zod';
import { SlackChannelNameModel, WebhookEndpointModel } from '../../lib/alert-channel-input';
import { AlertsManager } from '../../providers/alerts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

const DestinationModel = z.object({
  slack: z.object({ channel: SlackChannelNameModel }).nullish(),
  webhook: z.object({ endpoint: WebhookEndpointModel }).nullish(),
});

export const testDeliveryChannel: NonNullable<MutationResolvers['testDeliveryChannel']> = async (
  _,
  { input },
  { injector, req },
) => {
  const destination = DestinationModel.safeParse(input.destination);
  if (!destination.success) {
    return { error: { message: destination.error.issues[0].message, idempotencyKey: null } };
  }

  const result = await injector.get(AlertsManager).testChannel(
    {
      channelId: input.channelId,
      slackChannel: destination.data.slack?.channel ?? null,
      webhookEndpoint: destination.data.webhook?.endpoint ?? null,
    },
    req,
  );

  return result.delivered
    ? { ok: { idempotencyKey: result.idempotencyKey } }
    : { error: { message: result.message, idempotencyKey: result.idempotencyKey } };
};
