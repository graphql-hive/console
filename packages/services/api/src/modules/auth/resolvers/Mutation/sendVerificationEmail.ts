import { EmailVerification } from '../../providers/email-verification';
import type { MutationResolvers } from './../../../../__generated__/types';

export const sendVerificationEmail: NonNullable<
  MutationResolvers['sendVerificationEmail']
> = async (_, { input }, { injector }) => {
  const result = await injector.get(EmailVerification).sendVerificationEmail({
    superTokensUserId: input.superTokensUserId,
    email: input.email,
  });

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
