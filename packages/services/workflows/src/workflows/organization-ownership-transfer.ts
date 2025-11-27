import { z } from 'zod';
import { declareWorkflow, workflow } from '../kit.js';
import { renderOrganizationOwnershipTransferEmail } from '../lib/emails/templates/organization-ownership-transfer.js';

export const organizationOwnershipTransfer = declareWorkflow({
  name: 'organizationOwnershipTransfer',
  schema: z.object({
    organizationId: z.string(),
    organizationName: z.string(),
    authorName: z.string(),
    email: z.string(),
    link: z.string(),
  }),
});

export const register = workflow(organizationOwnershipTransfer, async args => {
  await args.step.run({ name: 'send-email' }, async () => {
    await args.context.email.send({
      to: args.input.email,
      subject: `Organization transfer from ${args.input.authorName} (${args.input.organizationName})`,
      body: renderOrganizationOwnershipTransferEmail({
        link: args.input.link,
        organizationName: args.input.organizationName,
        authorName: args.input.authorName,
      }),
    });
  });
});
