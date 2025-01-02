import { OrganizationManager } from '../providers/organization-manager';
import type { MemberResolvers } from './../../../__generated__/types';

export const Member: Pick<
  MemberResolvers,
  'canLeaveOrganization' | 'isAdmin' | 'role' | 'viewerCanRemove' | '__isTypeOf'
> = {
  canLeaveOrganization: async (member, _, { injector }) => {
    const { result } = await injector.get(OrganizationManager).canLeaveOrganization({
      organizationId: member.organization,
      userId: member.user.id,
    });

    return result;
  },
  isAdmin: (member, _, { injector }) => {
    return member.isOwner || injector.get(OrganizationManager).isAdminRole(member.role);
  },
  viewerCanRemove: async (member, _arg, { session }) => {
    if (member.isOwner) {
      return false;
    }

    return await session.canPerformAction({
      action: 'member:removeMember',
      organizationId: member.organization,
      params: {
        organizationId: member.organization,
      },
    });
  },
};
