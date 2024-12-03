import type { TargetCdnAccessTokenDeletedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "TargetCDNAccessTokenDeletedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const TargetCDNAccessTokenDeletedAuditLog: TargetCdnAccessTokenDeletedAuditLogResolvers = {
  __isTypeOf: e => e.eventAction === 'TARGET_CDN_ACCESS_TOKEN_DELETED',
  eventTime: e => new Date(e.timestamp).toISOString(),
  projectId: e => e.metadata.projectId,
  targetId: e => e.metadata.targetId,
  alias: e => e.metadata.alias,
  id: e => e.id,
  record: e => e,
};
