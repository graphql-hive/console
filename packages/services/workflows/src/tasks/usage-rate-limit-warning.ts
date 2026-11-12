import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { EMAIL_MAX_ATTEMPTS } from '../lib/emails/retry-policy.js';
import { sendTrackedEmail } from '../lib/emails/send-tracked-email.js';
import { renderRateLimitWarningEmail } from '../lib/emails/templates/rate-limit-warning.js';

export const UsageRateLimitWarningTask = defineTask({
  name: 'usageRateLimitWarning',
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

export const task = implementTask(UsageRateLimitWarningTask, async args => {
  await sendTrackedEmail({
    context: args.context,
    helpers: args.helpers,
    logger: args.logger,
    requestId: args.requestId,
    organizationId: args.input.organizationId,
    event: 'usage_rate_limit_warning',
    email: {
      subject: `${args.input.organizationName} is approaching its rate limit`,
      to: args.input.email,
      body: renderRateLimitWarningEmail({
        organizationName: args.input.organizationName,
        limit: args.input.limit,
        currentUsage: args.input.currentUsage,
        subscriptionManagementLink: args.input.subscriptionManagementLink,
      }),
    },
    metadata: { limit: String(args.input.limit), current_usage: String(args.input.currentUsage) },
  });
});
