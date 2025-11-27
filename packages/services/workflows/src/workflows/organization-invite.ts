import { z } from 'zod';
import { declareWorkflow, workflow } from '../kit.js';
import { renderOrganizationInvitation } from '../lib/emails/templates/organization-invitation.js';

export const organizationInvitation = declareWorkflow({
  name: 'organizationInvitation',
  schema: z.object({
    organizationId: z.string(),
    organizationName: z.string(),
    code: z.string(),
    email: z.string(),
    link: z.string(),
  }),
});

export const register = workflow(organizationInvitation, async args => {
  await args.step.run({ name: 'send-email' }, async () => {
    await args.context.email.send({
      to: args.input.email,
      subject: `You have been invited to join ${args.input.organizationName}`,
      body: renderOrganizationInvitation({
        link: args.input.link,
        organizationName: args.input.organizationName,
      }),
    });
  });
});
