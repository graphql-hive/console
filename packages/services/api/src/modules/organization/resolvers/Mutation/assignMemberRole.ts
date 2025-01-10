import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const assignMemberRole: NonNullable<MutationResolvers['assignMemberRole']> = async (
  _,
  { input },
  { injector },
) => {
  return injector.get(OrganizationManager).assignMemberRole({
    organizationSlug: input.organizationSlug,
    userId: input.userId,
    roleId: input.roleId,
  });
};
