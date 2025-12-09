import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { renderRateLimitWarningEmail } from '../lib/emails/templates/rate-limit-warning.js';

export const UsageRateLimitWarningTask = defineTask({
  name: 'usageRateLimitWarning',
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
  await args.context.email.send({
    subject: `GraphQL-Hive operations quota for ${args.input.organizationName} exceeded`,
    to: args.input.email,
    body: renderRateLimitWarningEmail({
      organizationName: args.input.organizationName,
      limit: args.input.limit,
      currentUsage: args.input.currentUsage,
      subscriptionManagementLink: args.input.subscriptionManagementLink,
    }),
  });
});
