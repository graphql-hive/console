import { Permission, Session } from '../../auth/lib/authz';
import type { MemberRoleResolvers } from './../../../__generated__/types';

export const MemberRole: MemberRoleResolvers = {
  canDelete: async (role, _, { injector }) => {
    if (role.isLocked) {
      return false;
    }
    return await injector.get(Session).canPerformAction({
      action: 'member:modify',
      organizationId: role.organizationId,
      params: {
        organizationId: role.organizationId,
      },
    });
  },
  canUpdate: async (role, _, { injector }) => {
    if (role.isLocked) {
      return false;
    }
    return await injector.get(Session).canPerformAction({
      action: 'member:modify',
      organizationId: role.organizationId,
      params: {
        organizationId: role.organizationId,
      },
    });
  },
  canInvite: async (role, _, { injector }) => {
    return await injector.get(Session).canPerformAction({
      action: 'member:modify',
      organizationId: role.organizationId,
      params: {
        organizationId: role.organizationId,
      },
    });
  },
  permissions: (role, _arg, _ctx) => {
    return Array.from(Object.values(role.permissions)).flatMap((set: Set<Permission>) =>
      Array.from(set),
    );
  },
};
