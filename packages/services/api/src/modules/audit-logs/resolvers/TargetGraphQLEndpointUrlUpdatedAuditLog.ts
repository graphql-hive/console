import type { TargetGraphQlEndpointUrlUpdatedAuditLogResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "TargetGraphQLEndpointUrlUpdatedAuditLogMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const TargetGraphQLEndpointUrlUpdatedAuditLog: TargetGraphQlEndpointUrlUpdatedAuditLogResolvers =
  {
    __isTypeOf: e => e.event_action === 'TARGET_GRAPHQL_ENDPOINT_URL_UPDATED',
    eventTime: e => new Date(e.timestamp).toISOString(),
    projectId: e => e.metadata.projectId,
    targetId: e => e.metadata.targetId,
    graphqlEndpointUrl: e => e.metadata.graphqlEndpointUrl,
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
