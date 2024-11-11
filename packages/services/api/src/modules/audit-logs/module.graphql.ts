import { gql } from 'graphql-modules';

export const typeDefs = gql`
  """
  AuditLog is a record of actions performed by users in
  the organization. It is used to track changes and
  actions performed by users.
  """
  interface AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
  }

  type AuditLogIdRecord {
    userId: ID!
    userEmail: String!
    organizationId: ID!
    """
    User can be null if the user is deleted
    """
    user: User
  }

  extend type Mutation {
    exportOrganizationAuditLog(
      selector: OrganizationSelectorInput!
      filter: AuditLogFilter
      pagination: AuditLogPaginationFilter
    ): ExportOrganizationAuditLogResult!
  }

  """
  Project Audit Logs
  """
  type ProjectCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    projectType: String!
    projectSlug: String!
  }

  type ProjectDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    projectSlug: String!
  }

  type ProjectPolicyUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    policy: JSON!
  }

  type ProjectSlugUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    previousSlug: String!
    newSlug: String!
  }

  """
  User Role Audit Logs
  """
  type RoleCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    roleId: String!
    roleName: String!
  }

  type RoleAssignedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    roleId: String!
    updatedMember: String!
    previousMemberRole: String # This one is nullable because can be without a previous role
    userIdAssigned: String!
  }

  type RoleDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    roleId: String!
    roleName: String!
  }

  type RoleUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    roleId: String!
    roleName: String!
    updatedFields: JSON!
  }

  """
  Support Ticket Audit Logs
  """
  type SupportTicketCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    ticketId: String!
    ticketSubject: String!
    ticketDescription: String!
    ticketPriority: String!
  }

  type SupportTicketUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    ticketId: String!
    updatedFields: JSON!
  }

  """
  Laboratory Collection Audit Logs
  """
  type CollectionCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    collectionId: String!
    collectionName: String!
    targetId: String!
  }

  type CollectionUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    collectionId: String!
    collectionName: String!
    updatedFields: JSON!
  }

  type CollectionDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    collectionId: String!
    collectionName: String!
  }

  """
  Operation In Document Collection Audit Logs
  """
  type OperationInDocumentCollectionCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    collectionId: String!
    collectionName: String!
    targetId: String!
    operationId: String!
    operationQuery: String!
  }

  type OperationInDocumentCollectionUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    collectionId: String!
    collectionName: String!
    operationId: String!
    updatedFields: JSON!
  }

  type OperationInDocumentCollectionDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    collectionId: String!
    collectionName: String!
    operationId: String!
  }

  """
  Organization Audit Logs
  """
  type OrganizationTransferredAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    newOwnerId: String!
    newOwnerEmail: String!
  }

  type OrganizationTransferredRequestAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    newOwnerId: String!
    """
    newOwnerEmail can be null if the mutation fails
    """
    newOwnerEmail: String
  }

  type OrganizationCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    organizationSlug: String!
    organizationId: String
  }

  type OrganizationDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    organizationId: String
  }

  type OrganizationSlugUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    previousSlug: String!
    newSlug: String!
  }

  type OrganizationPolicyUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    allowOverrides: Boolean!
    updatedFields: JSON!
  }

  type OrganizationPlanUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    previousPlan: String!
    newPlan: String!
  }

  type OrganizationUpdatedIntegrationAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    integrationId: String
    integrationType: String!
    integrationStatus: String!
  }

  """
  Target Audit Logs
  """
  type TargetCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    targetSlug: String!
  }

  type TargetDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    targetSlug: String!
  }

  type TargetSlugUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    previousSlug: String!
    newSlug: String!
  }

  type TargetGraphQLEndpointUrlUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    graphqlEndpointUrl: String!
  }

  type TargetSchemaCompositionUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    nativeComposition: Boolean!
  }

  type TargetCDNAccessTokenCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    alias: String!
  }

  type TargetCDNAccessTokenDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    alias: String!
  }

  type TargetTokenCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    alias: String!
  }

  type TargetTokenDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    projectId: String!
    targetId: String!
    alias: String!
  }

  """
  User Audit Logs
  """
  type UserInvitedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    roleId: String!
    inviteeEmail: String!
  }

  type UserJoinedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    inviteeEmail: String!
  }

  type UserRemovedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    removedUserId: String!
    removedUserEmail: String!
  }

  type UserSettingsUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    updatedFields: JSON!
  }

  """
  Subscription Audit Logs
  """
  type SubscriptionCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    paymentMethodId: String
    operations: Int!
    previousPlan: String!
    newPlan: String!
  }

  type SubscriptionUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    updatedFields: JSON!
  }

  type SubscriptionCanceledAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    previousPlan: String!
    newPlan: String!
  }

  """
  OIDC Integration Audit Logs
  """
  type OIDCIntegrationCreatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    integrationId: String!
  }

  type OIDCIntegrationDeletedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    integrationId: String!
  }

  type OIDCIntegrationUpdatedAuditLog implements AuditLog {
    id: ID!
    eventTime: DateTime!
    record: AuditLogIdRecord!
    integrationId: String!
    updatedFields: JSON!
  }
`;
