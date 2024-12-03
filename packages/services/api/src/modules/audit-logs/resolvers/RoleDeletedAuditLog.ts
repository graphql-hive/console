import type { RoleDeletedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "RoleDeletedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const RoleDeletedAuditLog: RoleDeletedAuditLogResolvers = {
  __isTypeOf: e => e.eventAction === 'ROLE_DELETED',
  eventTime: e => new Date(e.timestamp).toISOString(),
  roleId: e => e.metadata.roleId,
  roleName: e => e.metadata.roleName,
  id: e => e.id,
  record: e => e,
};
