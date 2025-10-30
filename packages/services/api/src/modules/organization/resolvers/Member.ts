import { Storage } from '../../shared/providers/storage';
import { filterDownPermissionGroups } from '../lib/permissions';
import * as PersonalAccessTokenPermissions from '../lib/personal-access-token-permissions';
import { OrganizationManager } from '../providers/organization-manager';
import { PersonalAccessTokens } from '../providers/personal-access-tokens';
import { ResourceAssignments } from '../providers/resource-assignments';
import type { MemberResolvers } from './../../../__generated__/types';

export const Member: MemberResolvers = {
  canLeaveOrganization: async (member, _, { injector }) => {
    const { result } = await injector.get(OrganizationManager).canLeaveOrganization(member);

    return result;
  },
  viewerCanRemove: async (member, _arg, { session }) => {
    if (member.isOwner) {
      return false;
    }

    return await session.canPerformAction({
      action: 'member:modify',
      organizationId: member.organizationId,
      params: {
        organizationId: member.organizationId,
      },
    });
  },
  role: (member, _arg, _ctx) => {
    return member.assignedRole.role;
  },
  id: async (member, _arg, _ctx) => {
    return member.userId;
  },
  user: async (member, _arg, { injector }) => {
    const user = await injector.get(Storage).getUserById({ id: member.userId });
    if (!user) {
      throw new Error('User not found.');
    }
    return user;
  },
  resourceAssignment: async (member, _arg, { injector }) => {
    return injector.get(ResourceAssignments).resolveGraphQLMemberResourceAssignment({
      organizationId: member.organizationId,
      resources: member.assignedRole.resources,
    });
  },
  personalAccessTokens: async (member, args, { injector }) => {
    return injector.get(PersonalAccessTokens).getPaginatedForMembership(member, {
      first: args.first ?? null,
      after: args.after ?? null,
    });
  },
  availablePersonalAccessTokenPermissionGroups: async (member, _arg, _ctx) => {
    // TODO: also filter down on feature flags...
    return filterDownPermissionGroups(
      PersonalAccessTokenPermissions.permissionGroups,
      member.assignedRole.role.allPermissions,
    );
  },
  personalAccessToken: async (member, args, { injector }) => {
    return injector.get(PersonalAccessTokens).findByIdForMembership(member, args.id);
  },
};
