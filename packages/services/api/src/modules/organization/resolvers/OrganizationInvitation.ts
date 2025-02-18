import { OrganizationMemberRoles } from '../providers/organization-member-roles';
import type { OrganizationInvitationResolvers } from './../../../__generated__/types';

export const OrganizationInvitation: OrganizationInvitationResolvers = {
  id: invitation => {
    return Buffer.from(
      [invitation.organization_id, invitation.email, invitation.code].join(':'),
    ).toString('hex');
  },
  createdAt: invitation => {
    return invitation.created_at;
  },
  expiresAt: invitation => {
    return invitation.expires_at;
  },
  role: async (invitation, _arg, { injector }) => {
    const role = await injector.get(OrganizationMemberRoles).findMemberRoleById(invitation.roleId);
    if (!role) {
      throw new Error('Not found.');
    }
    return role;
  },
};
