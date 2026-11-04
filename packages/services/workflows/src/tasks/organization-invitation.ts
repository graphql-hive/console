import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { sendTrackedEmail } from '../lib/emails/send-tracked-email.js';
import { renderOrganizationInvitation } from '../lib/emails/templates/organization-invitation.js';

export const OrganizationInvitationTask = defineTask({
  name: 'organizationInvitation',
  schema: z.object({
    organizationId: z.string(),
    organizationName: z.string(),
    code: z.string(),
    email: z.string(),
    link: z.string(),
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
  });
});
