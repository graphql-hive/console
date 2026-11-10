import { OrganizationMemberRoles } from '../providers/organization-member-roles';
import type { OrganizationInvitationResolvers } from './../../../__generated__/types';

export const OrganizationInvitation: Pick<
  OrganizationInvitationResolvers,
  'code' | 'createdAt' | 'email' | 'expiresAt' | 'id' | 'role'
> = {
  role: async (invitation, _arg, { injector }) => {
    const role = await injector.get(OrganizationMemberRoles).findMemberRoleById(invitation.roleId);
    if (!role) {
      throw new Error('Not found.');
    }
    return role;
  },
};
