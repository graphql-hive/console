import { z } from 'zod';
import { renderOrganizationInvitation } from '../lib/emails/templates/organization-invitation.js';
import { defineTask, implementTask } from '../postgraphile-kit.js';

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
  await args.context.email.send({
    to: args.input.email,
    subject: `You have been invited to join ${args.input.organizationName}`,
    body: renderOrganizationInvitation({
      link: args.input.link,
      organizationName: args.input.organizationName,
    }),
  });
});
