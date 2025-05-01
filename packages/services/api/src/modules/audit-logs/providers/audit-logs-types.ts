import { z } from 'zod';
import { ResourceAssignmentModel } from '../../organization/lib/resource-assignment-model';

export const AuditLogModel = z.union([
  z.object({
    eventType: z.literal('USER_INVITED'),
    metadata: z.object({
      inviteeEmail: z.string(),
      roleId: z.string().uuid(),
    }),
  }),
  z.object({
    eventType: z.literal('USER_JOINED'),
    metadata: z.object({
      inviteeEmail: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('USER_REMOVED'),
    metadata: z.object({
      removedUserId: z.string().uuid(),
      removedUserEmail: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('USER_SETTINGS_UPDATED'),
    metadata: z.object({
      updatedFields: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_POLICY_UPDATED'),
    metadata: z.object({
      allowOverrides: z.boolean(),
      policy: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_PLAN_UPDATED'),
    metadata: z.object({
      previousPlan: z.string(),
      newPlan: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_TRANSFERRED'),
    metadata: z.object({
      newOwnerId: z.string().uuid(),
      newOwnerEmail: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_TRANSFERRED_REQUEST'),
    metadata: z.object({
      newOwnerId: z.string().uuid(),
      newOwnerEmail: z.string().nullable(),
    }),
  }),
  z.object({
    eventType: z.literal('PROJECT_CREATED'),
    metadata: z.object({
      projectId: z.string().uuid().nullish(),
      projectSlug: z.string(),
      projectType: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('PROJECT_POLICY_UPDATED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      policy: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('PROJECT_SLUG_UPDATED'),
    metadata: z.object({
      previousSlug: z.string(),
      newSlug: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('PROJECT_DELETED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      projectSlug: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_CREATED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      targetSlug: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_SLUG_UPDATED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      previousSlug: z.string(),
      newSlug: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_GRAPHQL_ENDPOINT_URL_UPDATED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      graphqlEndpointUrl: z.string().nullish(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_SCHEMA_COMPOSITION_UPDATED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      nativeComposition: z.boolean(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_CDN_ACCESS_TOKEN_CREATED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      alias: z.string(),
      token: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_CDN_ACCESS_TOKEN_DELETED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      alias: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_TOKEN_CREATED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      alias: z.string(),
      token: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_TOKEN_DELETED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      alias: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('TARGET_DELETED'),
    metadata: z.object({
      projectId: z.string().uuid(),
      targetId: z.string().uuid(),
      targetSlug: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ROLE_CREATED'),
    metadata: z.object({
      roleId: z.string().uuid(),
      roleName: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ROLE_ASSIGNED'),
    metadata: z.object({
      roleId: z.string().uuid(),
      updatedMember: z.string(),
      previousMemberRole: z.string().nullable(),
      userIdAssigned: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ROLE_DELETED'),
    metadata: z.object({
      roleId: z.string().uuid(),
      roleName: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ROLE_UPDATED'),
    metadata: z.object({
      roleId: z.string().uuid(),
      roleName: z.string(),
      updatedFields: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('SUPPORT_TICKET_CREATED'),
    metadata: z.object({
      ticketId: z.string(),
      ticketSubject: z.string(),
      ticketCategory: z.string(),
      ticketProject: z.string(),
      ticketTarget: z.string(),
      ticketDescription: z.string(),
      ticketPriority: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('SUPPORT_TICKET_UPDATED'),
    metadata: z.object({
      ticketId: z.string(),
      updatedFields: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('COLLECTION_CREATED'),
    metadata: z.object({
      collectionId: z.string().uuid(),
      collectionName: z.string(),
      targetId: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('COLLECTION_UPDATED'),
    metadata: z.object({
      collectionId: z.string().uuid(),
      collectionName: z.string(),
      updatedFields: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('COLLECTION_DELETED'),
    metadata: z.object({
      collectionId: z.string().uuid(),
      collectionName: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('OPERATION_IN_DOCUMENT_COLLECTION_CREATED'),
    metadata: z.object({
      collectionId: z.string().uuid(),
      collectionName: z.string(),
      targetId: z.string().uuid(),
      operationId: z.string().uuid(),
      operationQuery: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('OPERATION_IN_DOCUMENT_COLLECTION_UPDATED'),
    metadata: z.object({
      collectionId: z.string().uuid(),
      collectionName: z.string(),
      operationId: z.string().uuid(),
      updatedFields: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('OPERATION_IN_DOCUMENT_COLLECTION_DELETED'),
    metadata: z.object({
      collectionId: z.string().uuid(),
      collectionName: z.string(),
      operationId: z.string().uuid(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_CREATED'),
    metadata: z.object({
      organizationSlug: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_SLUG_UPDATED'),
    metadata: z.object({
      previousSlug: z.string(),
      newSlug: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_DELETED'),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_UPDATED_INTEGRATION'),
    metadata: z.object({
      integrationId: z.string().nullable(),
      integrationType: z.enum(['SLACK', 'GITHUB']),
      integrationStatus: z.enum(['ENABLED', 'DISABLED']),
    }),
  }),
  z.object({
    eventType: z.literal('SUBSCRIPTION_CREATED'),
    metadata: z.object({
      paymentMethodId: z.string().nullish(),
      operations: z.number(),
      previousPlan: z.string(),
      newPlan: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('SUBSCRIPTION_UPDATED'),
    metadata: z.object({
      updatedFields: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('SUBSCRIPTION_CANCELED'),
    metadata: z.object({
      previousPlan: z.string(),
      newPlan: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('OIDC_INTEGRATION_CREATED'),
    metadata: z.object({
      integrationId: z.string().uuid(),
    }),
  }),
  z.object({
    eventType: z.literal('OIDC_INTEGRATION_DELETED'),
    metadata: z.object({
      integrationId: z.string().uuid(),
    }),
  }),
  z.object({
    eventType: z.literal('OIDC_INTEGRATION_UPDATED'),
    metadata: z.object({
      integrationId: z.string().uuid(),
      updatedFields: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('PREFLIGHT_SCRIPT_CHANGED'),
    metadata: z.object({
      scriptContents: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_ACCESS_TOKEN_CREATED'),
    metadata: z.object({
      organizationAccessTokenId: z.string().uuid(),
      permissions: z.array(z.string()),
      assignedResources: ResourceAssignmentModel,
    }),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_ACCESS_TOKEN_DELETED'),
    metadata: z.object({
      organizationAccessTokenId: z.string().uuid(),
    }),
  }),
]);

export type AuditLogSchemaEvent = z.infer<typeof AuditLogModel>;

const auditLogEventTypes = AuditLogModel.options.map(option => option.shape.eventType.value);

const AuditLogClickhouseObjectModel = z.object({
  id: z.string(),
  timestamp: z.string(),
  organizationId: z.string(),
  eventAction: z.enum(auditLogEventTypes as [string, ...string[]]),
  userId: z.string(),
  userEmail: z.string(),
  accessTokenId: z.string(),
  metadata: z.string(),
});

export type AuditLogType = z.infer<typeof AuditLogClickhouseObjectModel>;

export const AuditLogClickhouseArrayModel = z.array(AuditLogClickhouseObjectModel);
