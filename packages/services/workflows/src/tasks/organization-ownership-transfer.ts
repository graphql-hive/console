import { z } from 'zod';
import { renderOrganizationOwnershipTransferEmail } from '../lib/emails/templates/organization-ownership-transfer.js';
import { defineTask, implementTask } from '../postgraphile-kit.js';

export const OrganizationOwnershipTransferTask = defineTask({
  name: 'organizationOwnershipTransfer',
  schema: z.object({
    organizationId: z.string(),
    organizationName: z.string(),
    authorName: z.string(),
    email: z.string(),
    link: z.string(),
  }),
});

export const task = implementTask(OrganizationOwnershipTransferTask, async args => {
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
