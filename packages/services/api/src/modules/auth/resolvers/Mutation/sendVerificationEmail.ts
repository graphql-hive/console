import { EmailVerification } from '../../providers/email-verification';
import type { MutationResolvers } from './../../../../__generated__/types';

export const sendVerificationEmail: NonNullable<
  MutationResolvers['sendVerificationEmail']
> = async (_, { input }, { injector, req }) => {
  const result = await injector.get(EmailVerification).sendVerificationEmail(
    {
      superTokensUserId: input.superTokensUserId,
      email: input.email,
    },
    req.ip,
  );

  if (!result.ok) {
    return {
      error: {
        message: result.message,
      },
    };
  }

  return {
    ok: {
      expiresAt: result.expiresAt,
    },
  };
};
