import { OrganizationMemberRoles } from '../providers/organization-member-roles';
import { ResourceAssignments } from '../providers/resource-assignments';
import type { GroupRoleMappingResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "GroupRoleMappingMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
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
