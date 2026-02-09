import type { UserResolvers } from './../../../__generated__/types';

export const User: Pick<
  UserResolvers,
  'displayName' | 'email' | 'fullName' | 'id' | 'isAdmin' | 'provider' | 'providers'
> = {
  provider: user => user.providers[0],
};
