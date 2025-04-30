import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const inviteToOrganizationByEmail: NonNullable<
  MutationResolvers['inviteToOrganizationByEmail']
> = async (_, { input }, { injector }) => {
  const result = await injector.get(OrganizationManager).inviteByEmail({
    organization: input.organization,
    email: input.email,
    role: input.memberRoleId,
  });

  if (result.error) {
    return result;
  }

  return {
    ok: {
      createdOrganizationInvitation: result.ok,
    },
  };
};
