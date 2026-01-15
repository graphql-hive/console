import zod from 'zod';
import { AuthManager } from '../../providers/auth-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const sendVerificationEmail: NonNullable<
  MutationResolvers['sendVerificationEmail']
> = async (_, { input }, { injector }) => {
  const parseResult = zod.string().email().safeParse(input.email);
  if (!parseResult.success) {
    return {
      error: {
        message: parseResult.error.errors[0].message,
      },
    };
  }

  const result = await injector.get(AuthManager).sendVerificationEmail({
    superTokensUserId: input.superTokensUserId,
    email: parseResult.data,
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
