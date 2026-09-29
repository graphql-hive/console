import type { UserResolvers } from './../../../__generated__/types';

export const User: Pick<UserResolvers, 'canSwitchOrganization'> = {
  // Superadmins provisioned by SUPERADMIN_ORGANIZATION_ID need to reach the organizations they administer.
  canSwitchOrganization: user => user.provisionedByOrganizationId === null || user.isAdmin,
};
