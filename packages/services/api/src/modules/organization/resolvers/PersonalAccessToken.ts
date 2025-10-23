import { ResourceAssignments } from '../providers/resource-assignments';
import type { PersonalAccessTokenResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "PersonalAccessTokenMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const PersonalAccessToken: PersonalAccessTokenResolvers = {
  /* Implement PersonalAccessToken resolver logic here */
  resources: async (accessToken, _arg, { injector }) => {
    return injector.get(ResourceAssignments).resolveGraphQLMemberResourceAssignment({
      organizationId: accessToken.organizationId,
      resources: accessToken.assignedResources,
    });
  },
  assignedPermissions: async (_parent, _arg, _ctx) => {
    throw new Error('TODO: implement');
    /* PersonalAccessToken.assignedPermissions resolver is required because PersonalAccessToken.assignedPermissions exists but PersonalAccessTokenMapper.assignedPermissions does not */
  },
  assignedResources: (_parent, _arg, _ctx) => {
    throw new Error('TODO: implement');
    /* PersonalAccessToken.assignedResources resolver is required because PersonalAccessToken.assignedResources and PersonalAccessTokenMapper.assignedResources are not compatible */
  },
  permissions: (_parent, _arg, _ctx) => {
    throw new Error('TODO: implement, this needs to be inherited from the user rule');
  },
};
