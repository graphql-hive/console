import { getPermissionGroup } from '../lib/authz';
import type { PermissionResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "PermissionMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const Permission: PermissionResolvers = {
  dependsOnId: async (parent, _arg, _ctx) => {
    /* Permission.dependsOnId resolver is required because Permission.dependsOnId exists but PermissionMapper.dependsOnId does not */
    return parent.dependsOn ?? null;
  },
  level: async (parent, _arg, _ctx) => {
    return getPermissionGroup(parent.id);
  },
};
