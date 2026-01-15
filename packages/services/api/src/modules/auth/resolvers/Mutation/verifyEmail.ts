import { AuthManager } from '../../providers/auth-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const verifyEmail: NonNullable<MutationResolvers['verifyEmail']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(AuthManager).verifyEmail({
    superTokensUserId: input.superTokensUserId,
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
