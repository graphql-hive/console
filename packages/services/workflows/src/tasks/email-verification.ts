import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { renderEmailVerificationEmail } from '../lib/emails/templates/email-verification.js';

export const EmailVerificationTask = defineTask({
  name: 'emailVerification',
  schema: z.object({
    user: z.object({
      email: z.string(),
      id: z.string(),
    }),
    emailVerifyLink: z.string(),
  }),
});

export const task = implementTask(EmailVerificationTask, async args => {
  await args.context.email.send({
    to: args.input.user.email,
    subject: 'Verify your email',
    body: renderEmailVerificationEmail({
      verificationLink: args.input.emailVerifyLink,
      toEmail: args.input.user.email,
    }),
  });
});
