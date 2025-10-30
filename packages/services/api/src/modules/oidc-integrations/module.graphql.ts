import { gql } from 'graphql-modules';

export default gql`
  type ProjectForResourceSelector {
    id: ID!
    slug: String!
    type: ProjectType!
    targets: [TargetForResourceSelector!]!
  }

  type TargetForResourceSelector {
    id: ID!
    slug: String!
    services: [String!]!
    appDeployments: [String!]!
  }

  extend type Organization {
    viewerCanManageOIDCIntegration: Boolean!
    oidcIntegration: OIDCIntegration
    projectsForResourceSelector: [ProjectForResourceSelector]
  }

  extend type User {
    canSwitchOrganization: Boolean!
  }

  type OIDCIntegration {
    id: ID!
    clientId: ID!
    clientSecretPreview: String!
    tokenEndpoint: String!
    userinfoEndpoint: String!
    authorizationEndpoint: String!
    oidcUserAccessOnly: Boolean!
    defaultMemberRole: MemberRole!
    defaultResourceAssignment: ResourceAssignment
  }

  extend type Mutation {
    createOIDCIntegration(input: CreateOIDCIntegrationInput!): CreateOIDCIntegrationResult!
    updateOIDCIntegration(input: UpdateOIDCIntegrationInput!): UpdateOIDCIntegrationResult!
    deleteOIDCIntegration(input: DeleteOIDCIntegrationInput!): DeleteOIDCIntegrationResult!
    updateOIDCRestrictions(input: UpdateOIDCRestrictionsInput!): UpdateOIDCRestrictionsResult!
    updateOIDCDefaultMemberRole(
      input: UpdateOIDCDefaultMemberRoleInput!
    ): UpdateOIDCDefaultMemberRoleResult!
    updateOIDCDefaultResourceAssignment(
      input: UpdateOIDCDefaultResourceAssignmentInput!
    ): UpdateOIDCDefaultResourceAssignmentResult!
  }

  """
  @oneOf
  """
  type UpdateOIDCDefaultResourceAssignmentResult {
    ok: UpdateOIDCDefaultResourceAssignmentOk
    error: UpdateOIDCDefaultResourceAssignmentError
  }

  type UpdateOIDCDefaultResourceAssignmentOk {
    updatedOIDCIntegration: OIDCIntegration!
  }

  type UpdateOIDCDefaultResourceAssignmentError implements Error {
    message: String!
  }

  input UpdateOIDCDefaultResourceAssignmentInput {
    oidcIntegrationId: ID!
    resources: ResourceAssignmentInput!
  }

  extend type Subscription {
    """
    Subscribe to logs from the OIDC provider integration.
    Helpful for debugging failing logins.
    """
    oidcIntegrationLog(input: OIDCIntegrationLogSubscriptionInput!): OIDCIntegrationLogEvent!
  }

  input OIDCIntegrationLogSubscriptionInput {
    oidcIntegrationId: ID!
  }

  type OIDCIntegrationLogEvent {
    timestamp: DateTime!
    message: String!
  }

  input CreateOIDCIntegrationInput {
    organizationId: ID!
    clientId: ID!
    clientSecret: String!
    tokenEndpoint: String!
    userinfoEndpoint: String!
    authorizationEndpoint: String!
  }

  type CreateOIDCIntegrationResult {
    ok: CreateOIDCIntegrationOk
    error: CreateOIDCIntegrationError
  }

  type CreateOIDCIntegrationOk {
    createdOIDCIntegration: OIDCIntegration!
    organization: Organization!
  }

  type CreateOIDCIntegrationErrorDetails {
    clientId: String
    clientSecret: String
    tokenEndpoint: String
    userinfoEndpoint: String
    authorizationEndpoint: String
  }

  type CreateOIDCIntegrationError implements Error {
    message: String!
    details: CreateOIDCIntegrationErrorDetails!
  }

  input UpdateOIDCIntegrationInput {
    oidcIntegrationId: ID!
    clientId: ID
    clientSecret: String
    tokenEndpoint: String
    userinfoEndpoint: String
    authorizationEndpoint: String
  }

  type UpdateOIDCIntegrationResult {
    ok: UpdateOIDCIntegrationOk
    error: UpdateOIDCIntegrationError
  }

  type UpdateOIDCIntegrationOk {
    updatedOIDCIntegration: OIDCIntegration!
  }

  type UpdateOIDCIntegrationErrorDetails {
    clientId: String
    clientSecret: String
    tokenEndpoint: String
    userinfoEndpoint: String
    authorizationEndpoint: String
  }

  type UpdateOIDCIntegrationError implements Error {
    message: String!
    details: UpdateOIDCIntegrationErrorDetails!
  }

  input DeleteOIDCIntegrationInput {
    oidcIntegrationId: ID!
  }

  type DeleteOIDCIntegrationResult {
    ok: DeleteOIDCIntegrationOk
    error: DeleteOIDCIntegrationError
  }

  type DeleteOIDCIntegrationOk {
    organization: Organization!
  }

  type DeleteOIDCIntegrationError implements Error {
    message: String!
  }

  input UpdateOIDCRestrictionsInput {
    oidcIntegrationId: ID!
    """
    Applies only to newly invited members.
    Existing members are not affected.
    """
    oidcUserAccessOnly: Boolean!
  }

  """
  @oneOf
  """
  type UpdateOIDCRestrictionsResult {
    ok: UpdateOIDCRestrictionsOk
    error: UpdateOIDCRestrictionsError
  }

  type UpdateOIDCRestrictionsOk {
    updatedOIDCIntegration: OIDCIntegration!
  }

  type UpdateOIDCRestrictionsError implements Error {
    message: String!
  }

  input UpdateOIDCDefaultMemberRoleInput {
    oidcIntegrationId: ID!
    defaultMemberRoleId: ID!
  }

  """
  @oneOf
  """
  type UpdateOIDCDefaultMemberRoleResult {
    ok: UpdateOIDCDefaultMemberRoleOk
    error: UpdateOIDCDefaultMemberRoleError
  }

  type UpdateOIDCDefaultMemberRoleOk {
    updatedOIDCIntegration: OIDCIntegration!
  }

  type UpdateOIDCDefaultMemberRoleError implements Error {
    message: String!
  }
`;
