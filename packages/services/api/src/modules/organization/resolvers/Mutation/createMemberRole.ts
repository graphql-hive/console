import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createMemberRole: NonNullable<MutationResolvers['createMemberRole']> = async (
  _,
  { input },
  { injector },
) => {
  return await injector.get(OrganizationManager).createMemberRole({
    organizationSlug: input.organizationSlug,
    name: input.name,
    description: input.description,
    permissions: input.selectedPermissions,
  });
};
