import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { renderOrganizationOwnershipTransferEmail } from '../lib/emails/templates/organization-ownership-transfer.js';

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
