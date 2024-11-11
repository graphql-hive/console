import { z } from 'zod';

export const auditLogSchema = z.discriminatedUnion('eventType', [
  z.object({
    eventType: z.literal('USER_INVITED'),
    roleId: z.string().uuid(),
    inviteeEmail: z.string(),
  }),
  z.object({
    eventType: z.literal('USER_JOINED'),
    inviteeEmail: z.string(),
  }),
  z.object({
    eventType: z.literal('USER_REMOVED'),
    removedUserId: z.string().uuid(),
    removedUserEmail: z.string(),
  }),
  z.object({
    eventType: z.literal('USER_SETTINGS_UPDATED'),
    updatedFields: z.string(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_POLICY_UPDATED'),
    allowOverrides: z.boolean(),
    updatedFields: z.string(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_PLAN_UPDATED'),
    previousPlan: z.string(),
    newPlan: z.string(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_TRANSFERRED'),
    newOwnerId: z.string().uuid(),
    newOwnerEmail: z.string(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_TRANSFERRED_REQUEST'),
    newOwnerId: z.string().uuid(),
    newOwnerEmail: z.string().nullable(),
  }),
  z.object({
    eventType: z.literal('PROJECT_CREATED'),
    projectId: z.string().uuid(),
    projectSlug: z.string(),
    projectType: z.string(),
  }),
  z.object({
    eventType: z.literal('PROJECT_POLICY_UPDATED'),
    projectId: z.string().uuid(),
    policy: z.string(),
  }),
  z.object({
    eventType: z.literal('PROJECT_SLUG_UPDATED'),
    previousSlug: z.string(),
    newSlug: z.string(),
  }),
  z.object({
    eventType: z.literal('PROJECT_DELETED'),
    projectId: z.string().uuid(),
    projectSlug: z.string(),
  }),
  z.object({
    eventType: z.literal('TARGET_CREATED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    targetSlug: z.string(),
  }),
  z.object({
    eventType: z.literal('TARGET_SLUG_UPDATED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    previousSlug: z.string(),
    newSlug: z.string(),
  }),
  z.object({
    eventType: z.literal('TARGET_GRAPHQL_ENDPOINT_URL_UPDATED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    graphqlEndpointUrl: z.string().nullish(),
  }),
  z.object({
    eventType: z.literal('TARGET_SCHEMA_COMPOSITION_UPDATED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    nativeComposition: z.boolean(),
  }),
  z.object({
    eventType: z.literal('TARGET_CDN_ACCESS_TOKEN_CREATED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    alias: z.string(),
  }),
  z.object({
    eventType: z.literal('TARGET_CDN_ACCESS_TOKEN_DELETED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    alias: z.string(),
  }),
  z.object({
    eventType: z.literal('TARGET_TOKEN_CREATED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    alias: z.string(),
  }),
  z.object({
    eventType: z.literal('TARGET_TOKEN_DELETED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    alias: z.string(),
  }),
  z.object({
    eventType: z.literal('TARGET_DELETED'),
    projectId: z.string().uuid(),
    targetId: z.string().uuid(),
    targetSlug: z.string(),
  }),
  z.object({
    eventType: z.literal('ROLE_CREATED'),
    roleId: z.string().uuid(),
    roleName: z.string(),
  }),
  z.object({
    eventType: z.literal('ROLE_ASSIGNED'),
    roleId: z.string().uuid(),
    updatedMember: z.string(),
    previousMemberRole: z.string().nullable(),
    userIdAssigned: z.string(),
  }),
  z.object({
    eventType: z.literal('ROLE_DELETED'),
    roleId: z.string().uuid(),
    roleName: z.string(),
  }),
  z.object({
    eventType: z.literal('ROLE_UPDATED'),
    roleId: z.string().uuid(),
    roleName: z.string(),
    updatedFields: z.string(),
  }),
  z.object({
    eventType: z.literal('SUPPORT_TICKET_CREATED'),
    ticketId: z.string().uuid(),
    ticketSubject: z.string(),
    ticketDescription: z.string(),
    ticketPriority: z.string(),
  }),
  z.object({
    eventType: z.literal('SUPPORT_TICKET_UPDATED'),
    ticketId: z.string().uuid(),
    updatedFields: z.string(),
  }),
  z.object({
    eventType: z.literal('COLLECTION_CREATED'),
    collectionId: z.string().uuid(),
    collectionName: z.string(),
    targetId: z.string(),
  }),
  z.object({
    eventType: z.literal('COLLECTION_UPDATED'),
    collectionId: z.string().uuid(),
    collectionName: z.string(),
    updatedFields: z.string(),
  }),
  z.object({
    eventType: z.literal('COLLECTION_DELETED'),
    collectionId: z.string().uuid(),
    collectionName: z.string(),
  }),
  z.object({
    eventType: z.literal('OPERATION_IN_DOCUMENT_COLLECTION_CREATED'),
    collectionId: z.string().uuid(),
    collectionName: z.string(),
    targetId: z.string().uuid(),
    operationId: z.string().uuid(),
    operationQuery: z.string(),
  }),
  z.object({
    eventType: z.literal('OPERATION_IN_DOCUMENT_COLLECTION_UPDATED'),
    collectionId: z.string().uuid(),
    collectionName: z.string(),
    operationId: z.string().uuid(),
    updatedFields: z.string(),
  }),
  z.object({
    eventType: z.literal('OPERATION_IN_DOCUMENT_COLLECTION_DELETED'),
    collectionId: z.string().uuid(),
    collectionName: z.string(),
    operationId: z.string().uuid(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_CREATED'),
    organizationSlug: z.string(),
    organizationId: z.string().uuid(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_SLUG_UPDATED'),
    previousSlug: z.string(),
    newSlug: z.string(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_DELETED'),
    organizationId: z.string().uuid(),
  }),
  z.object({
    eventType: z.literal('ORGANIZATION_UPDATED_INTEGRATION'),
    integrationId: z.string().uuid().nullable(),
    integrationType: z.enum(['SLACK', 'GITHUB']),
    integrationStatus: z.enum(['ENABLED', 'DISABLED']),
  }),
  z.object({
    eventType: z.literal('SUBSCRIPTION_CREATED'),
    paymentMethodId: z.string().uuid().nullish(),
    operations: z.number(),
    previousPlan: z.string(),
    newPlan: z.string(),
  }),
  z.object({
    eventType: z.literal('SUBSCRIPTION_UPDATED'),
    updatedFields: z.string(),
  }),
  z.object({
    eventType: z.literal('SUBSCRIPTION_CANCELED'),
    previousPlan: z.string(),
    newPlan: z.string(),
  }),
  z.object({
    eventType: z.literal('OIDC_INTEGRATION_CREATED'),
    integrationId: z.string().uuid(),
  }),
  z.object({
    eventType: z.literal('OIDC_INTEGRATION_DELETED'),
    integrationId: z.string().uuid(),
  }),
  z.object({
    eventType: z.literal('OIDC_INTEGRATION_UPDATED'),
    integrationId: z.string().uuid(),
    updatedFields: z.string(),
  }),
]);

export type AuditLogSchemaEvent = z.infer<typeof auditLogSchema>;
