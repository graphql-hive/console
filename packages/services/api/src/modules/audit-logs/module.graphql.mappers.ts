import type { AuditLogType } from './providers/audit-logs-manager';

export type AuditLogMapper = AuditLogType;

// Organization
export type OrganizationTransferredAuditLogMapper = AuditLogType;
export type OrganizationTransferredRequestAuditLogMapper = AuditLogType;
export type OrganizationCreatedAuditLogMapper = AuditLogType;
export type OrganizationDeletedAuditLogMapper = AuditLogType;
export type OrganizationUpdatedIntegrationAuditLogMapper = AuditLogType;
export type OrganizationSlugUpdatedAuditLogMapper = AuditLogType;
export type OrganizationPolicyUpdatedAuditLogMapper = AuditLogType;
export type OrganizationPlanUpdatedAuditLogMapper = AuditLogType;
// Project
export type ProjectCreatedAuditLogMapper = AuditLogType;
export type ProjectDeletedAuditLogMapper = AuditLogType;
export type ProjectPolicyUpdatedAuditLogMapper = AuditLogType;
export type ProjectSlugUpdatedAuditLogMapper = AuditLogType;
// User Role
export type RoleCreatedAuditLogMapper = AuditLogType;
export type RoleAssignedAuditLogMapper = AuditLogType;
export type RoleDeletedAuditLogMapper = AuditLogType;
export type RoleUpdatedAuditLogMapper = AuditLogType;
// Support
export type SupportTicketCreatedAuditLogMapper = AuditLogType;
export type SupportTicketUpdatedAuditLogMapper = AuditLogType;
// Laboratory Collection
export type CollectionCreatedAuditLogMapper = AuditLogType;
export type CollectionDeletedAuditLogMapper = AuditLogType;
export type CollectionUpdatedAuditLogMapper = AuditLogType;
// Laboratory Collection Operation
export type OperationInDocumentCollectionCreatedAuditLogMapper = AuditLogType;
export type OperationInDocumentCollectionUpdatedAuditLogMapper = AuditLogType;
export type OperationInDocumentCollectionDeletedAuditLogMapper = AuditLogType;
// User
export type UserInvitedAuditLogMapper = AuditLogType;
export type UserJoinedAuditLogMapper = AuditLogType;
export type UserRemovedAuditLogMapper = AuditLogType;
export type UserSettingsUpdatedAuditLogMapper = AuditLogType;
// Target
export type TargetCreatedAuditLogMapper = AuditLogType;
export type TargetDeletedAuditLogMapper = AuditLogType;
export type TargetSlugUpdatedAuditLogMapper = AuditLogType;
export type TargetGraphQLEndpointUrlUpdatedAuditLogMapper = AuditLogType;
export type TargetSchemaCompositionUpdatedAuditLogMapper = AuditLogType;
export type TargetCDNAccessTokenCreatedAuditLogMapper = AuditLogType;
export type TargetCDNAccessTokenDeletedAuditLogMapper = AuditLogType;
export type TargetTokenCreatedAuditLogMapper = AuditLogType;
export type TargetTokenDeletedAuditLogMapper = AuditLogType;
// Subscription
export type SubscriptionCreatedAuditLogMapper = AuditLogType;
export type SubscriptionUpdatedAuditLogMapper = AuditLogType;
export type SubscriptionCanceledAuditLogMapper = AuditLogType;
// OIDC Integration
export type OIDCIntegrationCreatedAuditLogMapper = AuditLogType;
export type OIDCIntegrationDeletedAuditLogMapper = AuditLogType;
export type OIDCIntegrationUpdatedAuditLogMapper = AuditLogType;
