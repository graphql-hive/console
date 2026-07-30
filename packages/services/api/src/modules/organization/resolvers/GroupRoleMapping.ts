import { OrganizationMemberRoles } from '../providers/organization-member-roles';
import { ResourceAssignments } from '../providers/resource-assignments';
import type { GroupRoleMappingResolvers } from './../../../__generated__/types';

export const GroupRoleMapping: GroupRoleMappingResolvers = {
  async resourceAssignment(mapping, _, { injector }) {
    return injector.get(ResourceAssignments).resolveGraphQLMemberResourceAssignment({
      organizationId: mapping.organizationId,
      resources: mapping.assignedResources,
    });
  },
  async role(mapping, _, { injector }) {
    const role = await injector.get(OrganizationMemberRoles).findMemberRoleById(mapping.roleId);
    if (!role) {
      throw new Error('GroupRoleMapping.role: Role should exist.');
    }
    return role;
  },
};
