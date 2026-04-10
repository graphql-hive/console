import { gql } from 'graphql-modules';

export default gql`
  extend type Organization {
    viewerCanManageOIDCIntegration: Boolean!
    oidcIntegration: OIDCIntegration
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
    additionalScopes: [String!]!
    oidcUserJoinOnly: Boolean!
    oidcUserAccessOnly: Boolean!
    requireInvitation: Boolean!
    defaultMemberRole: MemberRole!
    defaultResourceAssignment: ResourceAssignment
    """
    List of domains registered with this OIDC integration.
    """
    registeredDomains: [OIDCIntegrationDomain!]!
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
    """
    Register a domain for the OIDC provider for a verification challenge.
    """
    registerOIDCDomain(input: RegisterOIDCDomainInput!): RegisterOIDCDomainResult!
    """
    Remove a domain from the OIDC provider list.
    """
    deleteOIDCDomain(input: DeleteOIDCDomainInput!): DeleteOIDCDomainResult!
    """
    Verify the domain verification challenge
    """
    verifyOIDCDomainChallenge(
      input: VerifyOIDCDomainChallengeInput!
    ): VerifyOIDCDomainChallengeResult!
    """
    Request a new domain verification challenge
    """
    requestOIDCDomainChallenge(
      input: RequestOIDCDomainChallengeInput!
    ): RequestOIDCDomainChallengeResult!
  }

  input RegisterOIDCDomainInput {
    oidcIntegrationId: ID!
    domainName: String!
  }

  type RegisterOIDCDomainResult {
    ok: RegisterOIDCDomainResultOk
    error: RegisterOIDCDomainResultError
  }

  type RegisterOIDCDomainResultOk {
    createdOIDCIntegrationDomain: OIDCIntegrationDomain!
    oidcIntegration: OIDCIntegration!
  }

  type RegisterOIDCDomainResultError {
    message: String!
  }

  input DeleteOIDCDomainInput {
    oidcDomainId: ID!
  }

  type DeleteOIDCDomainResult {
    ok: DeleteOIDCDomainOk
    error: DeleteOIDCDomainError
  }

  type DeleteOIDCDomainOk {
    deletedOIDCIntegrationId: ID!
    oidcIntegration: OIDCIntegration
  }

  type DeleteOIDCDomainError {
    message: String!
  }

  input VerifyOIDCDomainChallengeInput {
    oidcDomainId: ID!
  }

  type VerifyOIDCDomainChallengeResult {
    ok: VerifyOIDCDomainChallengeOk
    error: VerifyOIDCDomainChallengeError
  }

  type VerifyOIDCDomainChallengeOk {
    verifiedOIDCIntegrationDomain: OIDCIntegrationDomain!
  }

  type VerifyOIDCDomainChallengeError {
    message: String!
  }

  input RequestOIDCDomainChallengeInput {
    oidcDomainId: ID!
  }

  type RequestOIDCDomainChallengeResult {
    ok: RequestOIDCDomainChallengeResultOk
    error: RequestOIDCDomainChallengeResultError
  }

  type RequestOIDCDomainChallengeResultOk {
    oidcIntegrationDomain: OIDCIntegrationDomain
  }

  type RequestOIDCDomainChallengeResultError {
    message: String!
  }

  type OIDCIntegrationDomain {
    id: ID!
    domainName: String!
    createdAt: DateTime!
    verifiedAt: DateTime
    challenge: OIDCIntegrationDomainChallenge
  }

  type OIDCIntegrationDomainChallenge {
    recordName: String!
    recordType: String!
    recordValue: String!
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
    additionalScopes: [String!]!
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
    additionalScopes: String
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
    additionalScopes: [String!]
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
    additionalScopes: String
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
    oidcUserJoinOnly: Boolean
    oidcUserAccessOnly: Boolean
    requireInvitation: Boolean
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
