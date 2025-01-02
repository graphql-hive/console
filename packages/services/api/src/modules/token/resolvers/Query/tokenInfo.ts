import { Session } from '../../../auth/lib/authz';
import { TokenManager } from '../../providers/token-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const tokenInfo: NonNullable<QueryResolvers['tokenInfo']> = async (
  _parent,
  _arg,
  { injector },
) => {
  try {
    injector.get(Session).getLegacySelector();
  } catch (error) {
    return {
      __typename: 'TokenNotFoundError',
      message: (error as Error).message,
    };
  }

  return injector.get(TokenManager).getCurrentToken();
};
