import type { OperationInDocumentCollectionCreatedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "OperationInDocumentCollectionCreatedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const OperationInDocumentCollectionCreatedAuditLog: OperationInDocumentCollectionCreatedAuditLogResolvers =
  {
    __isTypeOf: e => e.event_action === 'OPERATION_IN_DOCUMENT_COLLECTION_CREATED',
    eventTime: e => new Date(e.timestamp).toISOString(),
    collectionId: e => e.metadata.collectionId,
    operationId: e => e.metadata.operationId,
    operationQuery: e => e.metadata.operationQuery,
    targetId: e => e.metadata.targetId,
    collectionName: e => e.metadata.collectionName,
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
