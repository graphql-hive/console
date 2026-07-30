import { GroupMemberStore } from '../providers/group-member-store';
import { GroupRoleAssignmentStore } from '../providers/group-role-assignment-store';
import type { GroupResolvers } from './../../../__generated__/types';

export const Group: GroupResolvers = {
  async memberCount(group, _, { injector }) {
    return injector.get(GroupMemberStore).getTotalMemberCountByGroupId(group.id);
  },
  name(group) {
    return group.displayName;
  },
  async roleMappings(group, _, { injector }) {
    return injector.get(GroupRoleAssignmentStore).getGroupRoleAssignmentsForGroupId(group.id);
  },
  async roleMappingCount(group, _, { injector }) {
    return injector
      .get(GroupRoleAssignmentStore)
      .getTotalGroupRoleAssignmentCountForGroupId(group.id);
  },
};
