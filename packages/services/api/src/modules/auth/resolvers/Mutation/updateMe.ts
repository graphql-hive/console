import { AuthManager } from '../../providers/auth-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateMe: NonNullable<MutationResolvers['updateMe']> = async (
  _,
  { input },
  { injector },
) => {
  const updateResult = await injector.get(AuthManager).updateCurrentUser(input);

  if (updateResult.type === 'error') {
    return {
      error: {
        inputErrors: updateResult.error.inputErrors,
        message: updateResult.error.message,
      },
    };
  }

  return {
    ok: {
      updatedUser: updateResult.user,
    },
  };
};
