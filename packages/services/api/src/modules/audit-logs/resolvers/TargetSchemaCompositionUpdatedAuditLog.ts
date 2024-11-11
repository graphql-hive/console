import type { TargetSchemaCompositionUpdatedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "TargetSchemaCompositionUpdatedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const TargetSchemaCompositionUpdatedAuditLog: TargetSchemaCompositionUpdatedAuditLogResolvers =
  {
    __isTypeOf: e => e.event_action === 'TARGET_SCHEMA_COMPOSITION_UPDATED',
    eventTime: e => new Date(e.event_time).toISOString(),
    projectId: e => e.metadata.projectId,
    targetId: e => e.metadata.targetId,
    nativeComposition: e => e.metadata.nativeComposition,
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
