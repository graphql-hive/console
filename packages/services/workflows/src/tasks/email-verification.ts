import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { renderEmailVerificationEmail } from '../lib/emails/templates/email-verification.js';

export const EmailVerificationTask = defineTask({
  name: 'emailVerification',
  schema: z.object({
    email: z.string(),
    verificationLink: z.string(),
  }),
});

export const task = implementTask(EmailVerificationTask, async args => {
  await args.context.email.send({
    to: args.input.email,
    subject: 'Verify your email',
    body: renderEmailVerificationEmail({
      verificationLink: args.input.verificationLink,
      toEmail: args.input.email,
    }),
  });
});
