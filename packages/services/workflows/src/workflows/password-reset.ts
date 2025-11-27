import { z } from 'zod';
import { declareWorkflow, workflow } from '../kit';
import { renderPasswordResetEmail } from '../lib/emails/templates/password-reset';

export const passwordReset = declareWorkflow({
  name: 'passwordReset',
  schema: z.object({
    user: z.object({
      email: z.string(),
      id: z.string(),
    }),
    passwordResetLink: z.string(),
  }),
});

export const register = workflow(passwordReset, async args => {
  await args.step.run({ name: 'send-email' }, async () => {
    await args.context.email.send({
      subject: `Reset your password`,
      to: args.input.user.email,
      body: renderPasswordResetEmail({
        passwordResetLink: args.input.passwordResetLink,
        toEmail: args.input.user.email,
      }),
    });
  });
});
