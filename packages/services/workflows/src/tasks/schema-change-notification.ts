import { defineTask, implementTask } from '../kit.js';
import { sendWebhook } from '../lib/webhooks/send-webhook.js';
import { SchemaChangeNotification } from '../webhooks/schema-change-notification.js';

export const SchemaChangeNotificationTask = defineTask({
  name: 'schemaChangeNotification',
  schema: SchemaChangeNotification,
});

export const task = implementTask(SchemaChangeNotificationTask, async args => {
  await sendWebhook(args.context.logger, args.context.requestBroker, {
    attempt: args.helpers.job.attempts,
    maxAttempts: args.helpers.job.max_attempts,
    data: args.input.event,
    endpoint: args.input.endpoint,
  });
});
