import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { attemptEmail, EMAIL_MAX_ATTEMPTS } from '../lib/emails/retry-policy.js';
import { renderEmailVerificationEmail } from '../lib/emails/templates/email-verification.js';

/** How long an email verification link stays valid; the email states it and the API enforces it. */
export const EMAIL_VERIFICATION_LINK_VALID_MINUTES = 30;

export const EmailVerificationTask = defineTask({
  name: 'emailVerification',
  maxAttempts: EMAIL_MAX_ATTEMPTS,
  schema: z.object({
    user: z.object({
      email: z.string(),
    }),
    emailVerifyLink: z.string(),
  }),
});

export const task = implementTask(EmailVerificationTask, async args => {
  await attemptEmail(
    () =>
      args.context.email.send({
        to: args.input.user.email,
        subject: 'Verify your email',
        body: renderEmailVerificationEmail({
          verificationLink: args.input.emailVerifyLink,
          toEmail: args.input.user.email,
          validForMinutes: EMAIL_VERIFICATION_LINK_VALID_MINUTES,
        }),
      }),
    args,
  );
});
