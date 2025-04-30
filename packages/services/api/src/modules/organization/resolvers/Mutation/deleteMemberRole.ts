import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteMemberRole: NonNullable<MutationResolvers['deleteMemberRole']> = async (
  _,
  { input },
  { injector },
) => {
  return injector.get(OrganizationManager).deleteMemberRole({
    memberRoleId: input.memberRoleId,
  });
};
