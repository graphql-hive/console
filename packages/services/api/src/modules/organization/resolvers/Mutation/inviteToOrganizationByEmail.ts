import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const inviteToOrganizationByEmail: NonNullable<
  MutationResolvers['inviteToOrganizationByEmail']
> = async (_, { input }, { injector, req }) => {
  const result = await injector.get(OrganizationManager).inviteByEmail(
    {
      organization: input.organization,
      email: input.email,
      role: input.memberRoleId ?? null,
      resources: input.resources ?? null,
    },
    req,
  );

  if (result.error) {
    return result;
  }

  return {
    ok: {
      createdOrganizationInvitation: result.ok,
    },
  };
};
