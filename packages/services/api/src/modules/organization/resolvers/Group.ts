import { GroupMemberStore } from '../providers/group-member-store';
import { GroupRoleAssignmentStore } from '../providers/group-role-assignment-store';
import type { GroupResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "GroupMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const Group: GroupResolvers = {
  /* Implement Group resolver logic here */
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
