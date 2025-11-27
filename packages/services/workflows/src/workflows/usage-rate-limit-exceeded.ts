import { z } from 'zod';
import { declareWorkflow, workflow } from '../kit';
import { renderRateLimitExceededEmail } from '../lib/emails/templates/rate-limit-exceeded';

export const usageRateLimitExceeded = declareWorkflow({
  name: 'usageRateLimitExceeded',
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

export const register = workflow(usageRateLimitExceeded, async args => {
  await args.step.run({ name: 'send-email' }, async () => {
    await args.context.email.send({
      subject: `GraphQL-Hive operations quota for ${args.input.organizationName} exceeded`,
      to: args.input.email,
      body: renderRateLimitExceededEmail({
        organizationName: args.input.organizationName,
        currentUsage: args.input.currentUsage,
        limit: args.input.limit,
        subscriptionManagementLink: args.input.subscriptionManagementLink,
      }),
    });
  });

  // TODO: Webhooks ?!
});
