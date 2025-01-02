import type { UserResolvers } from './../../../__generated__/types';

export const User: Pick<UserResolvers, 'canSwitchOrganization' | '__isTypeOf'> = {
  canSwitchOrganization: user => !user.oidcIntegrationId,
};
