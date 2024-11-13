import type { UserRemovedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "UserRemovedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const UserRemovedAuditLog: UserRemovedAuditLogResolvers = {
  __isTypeOf: e => e.event_action === 'USER_REMOVED',
  eventTime: e => new Date(e.timestamp).toISOString(),
  removedUserEmail: e => e.metadata.removedUserEmail,
  removedUserId: e => e.metadata.removedUserId,
  id: e => e.id,
  record: async (event, _arg, _ctx) => {
    return {
      userEmail: event.user_email,
      userId: event.user_id,
      organizationId: event.organization_id,
      user: event.metadata.user,
    };
  },
};
