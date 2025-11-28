import { z } from 'zod';
import { renderPasswordResetEmail } from '../lib/emails/templates/password-reset';
import { defineTask, implementTask } from '../postgraphile-kit.js';

export const PasswordResetTask = defineTask({
  name: 'passwordReset',
  schema: z.object({
    user: z.object({
      email: z.string(),
      id: z.string(),
    }),
    passwordResetLink: z.string(),
  }),
});

export const task = implementTask(PasswordResetTask, async args => {
  await args.context.email.send({
    subject: `Reset your password`,
    to: args.input.user.email,
    body: renderPasswordResetEmail({
      passwordResetLink: args.input.passwordResetLink,
      toEmail: args.input.user.email,
    }),
  });
});
