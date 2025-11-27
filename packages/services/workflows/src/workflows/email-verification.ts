import { z } from 'zod';
import { declareWorkflow, workflow } from '../kit.js';
import { renderEmailVerificationEmail } from '../lib/emails/templates/email-verification.js';

export const emailVerification = declareWorkflow({
  name: 'emailVerification',
  schema: z.object({
    user: z.object({
      email: z.string(),
      id: z.string(),
    }),
    emailVerifyLink: z.string(),
  }),
});

export const register = workflow(emailVerification, async args => {
  await args.step.run({ name: 'send-email' }, async () => {
    await args.context.email.send({
      to: args.input.user.email,
      subject: 'Verify your email',
      body: renderEmailVerificationEmail({
        verificationLink: args.input.emailVerifyLink,
        toEmail: args.input.user.email,
      }),
    });
  });
});
