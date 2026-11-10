import { randomUUID } from 'node:crypto';
import { defineTask, implementTask } from '../kit.js';
import { buildHiveWebhookHeaders } from '../lib/delivery-metadata.js';
import { sendWebhook } from '../lib/webhooks/send-webhook.js';
import { SchemaChangeNotification } from '../webhooks/schema-change-notification.js';

export const SchemaChangeNotificationTask = defineTask({
  name: 'schemaChangeNotification',
  schema: SchemaChangeNotification,
});

export const task = implementTask(SchemaChangeNotificationTask, async args => {
  const { input, context, helpers } = args;
  // Jobs enqueued before the channel id was part of the payload are still delivered, but
  // cannot be attributed to a channel, so they are not recorded.
  const channel = input.channelId
    ? {
        id: input.channelId,
        idempotencyKey: `schema-change:${input.event.schema.id}:${input.channelId}`,
      }
    : null;
  const headers = buildHiveWebhookHeaders({
    requestId: args.requestId ?? randomUUID(),
    event: 'schema_change',
    targetId: input.event.target.id,
    schemaId: input.event.schema.id,
    release: context.release,
    idempotencyKey: channel?.idempotencyKey,
  });

  await sendWebhook(context.logger, context.requestBroker, {
    attempt: helpers.job.attempts,
    maxAttempts: helpers.job.max_attempts,
    data: input.event,
    endpoint: input.endpoint,
    headers,
    delivery: channel
      ? {
          recorder: context.deliveries,
          meta: {
            organizationId: input.event.organization.id,
            deliveryType: 'WEBHOOK',
            destination: channel.id,
            event: 'schema_change',
            idempotencyKey: channel.idempotencyKey,
            attempt: helpers.job.attempts,
            maxAttempts: helpers.job.max_attempts,
            metadata: headers,
          },
        }
      : undefined,
  });
});
