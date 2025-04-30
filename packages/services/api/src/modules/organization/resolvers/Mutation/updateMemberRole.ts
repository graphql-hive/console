import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateMemberRole: NonNullable<MutationResolvers['updateMemberRole']> = async (
  _,
  { input },
  { injector },
) => {
  return injector.get(OrganizationManager).updateMemberRole({
    memberRoleId: input.memberRoleId,
    name: input.name,
    description: input.description,
    permissions: input.selectedPermissions,
  });
};
