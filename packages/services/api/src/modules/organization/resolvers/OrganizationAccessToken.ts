import type { OrganizationAccessTokenResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "OrganizationAccessTokenMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const OrganizationAccessToken: OrganizationAccessTokenResolvers = {
  /* Implement OrganizationAccessToken resolver logic here */
  permissions: ({ permissions }, _arg, _ctx) => {
    /* OrganizationAccessToken.permissions resolver is required because OrganizationAccessToken.permissions and OrganizationAccessTokenMapper.permissions are not compatible */
    return permissions;
  },
  resources: async (_parent, _arg, _ctx) => {
    /* OrganizationAccessToken.resources resolver is required because OrganizationAccessToken.resources exists but OrganizationAccessTokenMapper.resources does not */
  },
};
