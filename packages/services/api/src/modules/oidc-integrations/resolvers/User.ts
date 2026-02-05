import type { UserResolvers } from './../../../__generated__/types';

export const User: Pick<UserResolvers, 'canSwitchOrganization'> = {
  canSwitchOrganization: user => !user.oidcIntegrationId,
};
