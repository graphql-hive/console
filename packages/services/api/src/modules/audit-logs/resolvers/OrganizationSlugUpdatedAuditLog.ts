import type { OrganizationSlugUpdatedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "OrganizationSlugUpdatedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const OrganizationSlugUpdatedAuditLog: OrganizationSlugUpdatedAuditLogResolvers = {
  __isTypeOf: e => e.eventAction === 'ORGANIZATION_SLUG_UPDATED',
  eventTime: e => new Date(e.timestamp).toISOString(),
  previousSlug: e => e.metadata.previousSlug,
  newSlug: e => e.metadata.newSlug,
  id: e => e.id,
  record: e => e,
};
