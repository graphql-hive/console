import { auditLogUserSchema } from '../providers/audit-logs-types';
import type { UserJoinedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "UserJoinedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const UserJoinedAuditLog: UserJoinedAuditLogResolvers = {
  __isTypeOf: e => e.event_action === 'USER_JOINED',
  eventTime: e => new Date(e.timestamp).toISOString(),
  inviteeEmail: e => e.metadata.inviteeEmail,
  id: e => e.id,
  record: e => auditLogUserSchema.parse(e),
};
