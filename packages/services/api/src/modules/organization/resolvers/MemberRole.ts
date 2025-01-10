import { Session } from '../../auth/lib/authz';
import type { MemberRoleResolvers } from './../../../__generated__/types';

export const MemberRole: MemberRoleResolvers = {
  canDelete: async (role, _, { injector }) => {
    if (role.isLocked) {
      return false;
    }
    return await injector.get(Session).canPerformAction({
      action: 'member:modifyRole',
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
      action: 'member:modifyRole',
      organizationId: role.organizationId,
      params: {
        organizationId: role.organizationId,
      },
    });
  },
  canInvite: async (role, _, { injector }) => {
    return await injector.get(Session).canPerformAction({
      action: 'member:manageInvites',
      organizationId: role.organizationId,
      params: {
        organizationId: role.organizationId,
      },
    });
  },
  locked: async (role, _arg, _ctx) => {
    return role.isLocked;
  },
  permissions: (role, _arg, _ctx) => {
    return [
      ...role.permissions.organization,
      ...role.permissions.project,
      ...role.permissions.target,
      ...role.permissions.service,
      ...role.permissions.appDeployment,
    ];
  },
};
