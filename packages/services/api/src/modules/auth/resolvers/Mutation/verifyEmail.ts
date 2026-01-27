import { EmailVerification } from '../../providers/email-verification';
import type { MutationResolvers } from './../../../../__generated__/types';

export const verifyEmail: NonNullable<MutationResolvers['verifyEmail']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(EmailVerification).verifyEmail({
    userIdentityId: input.userIdentityId,
    token: input.token,
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
      verified: result.verified,
    },
  };
};
