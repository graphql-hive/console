import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { EMAIL_MAX_ATTEMPTS } from '../lib/emails/retry-policy.js';
import { sendTrackedEmail } from '../lib/emails/send-tracked-email.js';
import { renderOrganizationInvitation } from '../lib/emails/templates/organization-invitation.js';

export const OrganizationInvitationTask = defineTask({
  name: 'organizationInvitation',
  maxAttempts: EMAIL_MAX_ATTEMPTS,
  schema: z.object({
    organizationId: z.string(),
    organizationName: z.string(),
    code: z.string(),
    email: z.string(),
    link: z.string(),
    /**
     * Identifies this invitation's email across the job's attempts, recorded with each delivery.
     * The API builds it from the recipient and the invitation's creation time and reads the
     * invitation's status back by it. Absent on jobs enqueued before it was added.
     */
    idempotencyKey: z.string().optional(),
  }),
});

export const task = implementTask(OrganizationInvitationTask, async args => {
  await sendTrackedEmail({
    context: args.context,
    helpers: args.helpers,
    logger: args.logger,
    requestId: args.requestId,
    organizationId: args.input.organizationId,
    event: 'organization_invitation',
    email: {
      to: args.input.email,
      subject: `You have been invited to join ${args.input.organizationName}`,
      body: renderOrganizationInvitation({
        link: args.input.link,
        organizationName: args.input.organizationName,
      }),
    },
    idempotencyKey: args.input.idempotencyKey,
  });
});
