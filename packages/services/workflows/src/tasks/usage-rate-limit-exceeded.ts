import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { EMAIL_MAX_ATTEMPTS } from '../lib/emails/retry-policy.js';
import { sendTrackedEmail } from '../lib/emails/send-tracked-email.js';
import { renderRateLimitExceededEmail } from '../lib/emails/templates/rate-limit-exceeded.js';

export const UsageRateLimitExceededTask = defineTask({
  name: 'usageRateLimitExceeded',
  maxAttempts: EMAIL_MAX_ATTEMPTS,
  schema: z.object({
    organizationId: z.string(),
    organizationName: z.string(),
    limit: z.number(),
    currentUsage: z.number(),
    startDate: z.number(),
    endDate: z.number(),
    subscriptionManagementLink: z.string(),
    email: z.string(),
  }),
});

export const task = implementTask(UsageRateLimitExceededTask, async args => {
  await sendTrackedEmail({
    context: args.context,
    helpers: args.helpers,
    logger: args.logger,
    requestId: args.requestId,
    organizationId: args.input.organizationId,
    event: 'usage_rate_limit_exceeded',
    email: {
      subject: `GraphQL-Hive operations quota for ${args.input.organizationName} exceeded`,
      to: args.input.email,
      body: renderRateLimitExceededEmail({
        organizationName: args.input.organizationName,
        currentUsage: args.input.currentUsage,
        limit: args.input.limit,
        subscriptionManagementLink: args.input.subscriptionManagementLink,
      }),
    },
    metadata: { limit: String(args.input.limit), current_usage: String(args.input.currentUsage) },
  });
});
