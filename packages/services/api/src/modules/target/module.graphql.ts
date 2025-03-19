import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    target(selector: TargetSelectorInput!): Target
    targets(selector: ProjectSelectorInput!): TargetConnection!
  }

  extend type Mutation {
    createTarget(input: CreateTargetInput!): CreateTargetResult!
    updateTargetSlug(input: UpdateTargetSlugInput!): UpdateTargetSlugResult!
    deleteTarget(selector: TargetSelectorInput!): DeleteTargetPayload!
    updateTargetValidationSettings(
      input: UpdateTargetValidationSettingsInput!
    ): UpdateTargetValidationSettingsResult!
    setTargetValidation(input: SetTargetValidationInput!): Target!
    """
    Updates the target's explorer endpoint url.
    """
    updateTargetGraphQLEndpointUrl(
      input: UpdateTargetGraphQLEndpointUrlInput!
    ): UpdateTargetGraphQLEndpointUrlResult!
    updateTargetDangerousChangeClassification(
      input: UpdateTargetDangerousChangeClassificationInput!
      input: UpdateTargetDangerousChangeClassificationInput!
    ): UpdateTargetDangerousChangeClassificationResult!
    """
    Overwrites project's schema composition library.
    Works only for Federation projects with native composition enabled.
    This mutation is temporary and will be removed once no longer needed.
    It's part of a feature flag called "forceLegacyCompositionInTargets".
    """
    experimental__updateTargetSchemaComposition(
      input: Experimental__UpdateTargetSchemaCompositionInput!
    ): Target!
  }

  input Experimental__UpdateTargetSchemaCompositionInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    nativeComposition: Boolean!
  }

  input UpdateTargetGraphQLEndpointUrlInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    graphqlEndpointUrl: String
  }

  input UpdateTargetDangerousChangeClassificationInput {
    target: TargetReferenceInput!
    considerDangerousToBeBreaking: Boolean!
  }

  type UpdateTargetDangerousChangeClassificationOk {
    target: Target!
  }

  type UpdateTargetDangerousChangeClassificationError {
    message: String!
  }

  type UpdateTargetDangerousChangeClassificationResult {
    ok: UpdateTargetDangerousChangeClassificationOk
    error: UpdateTargetDangerousChangeClassificationError
  }

  type UpdateTargetGraphQLEndpointUrlOk {
    target: Target!
  }

  type UpdateTargetGraphQLEndpointUrlError {
    message: String!
  }

  type UpdateTargetGraphQLEndpointUrlResult {
    ok: UpdateTargetGraphQLEndpointUrlOk
    error: UpdateTargetGraphQLEndpointUrlError
  }

  input UpdateTargetSlugInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    slug: String!
  }

  type UpdateTargetSlugResult {
    ok: UpdateTargetSlugOk
    error: UpdateTargetSlugError
  }

  type UpdateTargetSlugOk {
    selector: TargetSelector!
    target: Target!
  }

  type UpdateTargetSlugError implements Error {
    message: String!
  }

  type CreateTargetResult {
    ok: CreateTargetOk
    error: CreateTargetError
  }

  type CreateTargetInputErrors {
    slug: String
  }

  type CreateTargetError implements Error {
    message: String!
    inputErrors: CreateTargetInputErrors!
  }

  type CreateTargetOk {
    selector: TargetSelector!
    createdTarget: Target!
  }

  input TargetSelectorInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
  }

  """
  Reference to a target.
  """
  input TargetReferenceInput @oneOf {
    """
    Reference to a target using it's ID (see "Target.id" field).
    """
    byId: ID
    """
    Reference to a target using it's slug parts (see "Organization.slug", "Project.slug", "Target.slug").
    """
    bySelector: TargetSelectorInput
  }

  input UpdateTargetValidationSettingsInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    period: Int!
    percentage: Float!
    requestCount: Int! = 1
    breakingChangeFormula: BreakingChangeFormula! = PERCENTAGE
    targetIds: [ID!]!
    excludedClients: [String!]
  }

  type UpdateTargetValidationSettingsResult {
    ok: UpdateTargetValidationSettingsOk
    error: UpdateTargetValidationSettingsError
  }

  type UpdateTargetValidationSettingsInputErrors {
    percentage: String
    period: String
    requestCount: String
  }

  type UpdateTargetValidationSettingsError implements Error {
    message: String!
    inputErrors: UpdateTargetValidationSettingsInputErrors!
  }

  type UpdateTargetValidationSettingsOk {
    target: Target!
  }

  input SetTargetValidationInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    enabled: Boolean!
  }

  type TargetSelector {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
  }

  extend type Project {
    targets: TargetConnection!
    targetBySlug(targetSlug: String!): Target
  }

  type TargetConnection {
    nodes: [Target!]!
    total: Int!
  }

  type Target {
    id: ID!
    slug: String!
    cleanId: ID! @deprecated(reason: "Use the 'slug' field instead.")
    name: String! @deprecated(reason: "Use the 'slug' field instead.")
    project: Project!
    """
    The endpoint url of the target's explorer instance.
    """
    graphqlEndpointUrl: String
    considerDangerousToBeBreaking: Boolean!
    validationSettings: TargetValidationSettings!
    experimental_forcedLegacySchemaComposition: Boolean!
    viewerCanAccessSettings: Boolean!
    viewerCanModifySettings: Boolean!
    viewerCanModifyTargetAccessToken: Boolean!
    viewerCanModifyCDNAccessToken: Boolean!
    viewerCanDelete: Boolean!
  }

  type TargetValidationSettings {
    enabled: Boolean!
    period: Int!

    """
    If TargetValidationSettings.breakingChangeFormula is PERCENTAGE, then this
    is the percent of the total operations over the TargetValidationSettings.period
    required for a change to be considered breaking.
    """
    percentage: Float!

    """
    If TargetValidationSettings.breakingChangeFormula is REQUEST_COUNT, then this
    is the total number of operations over the TargetValidationSettings.period
    required for a change to be considered breaking.
    """
    requestCount: Int!

    """
    Determines which formula is used to determine if a change is considered breaking
    or not. Only one formula can be used at a time.
    """
    breakingChangeFormula: BreakingChangeFormula!
    targets: [Target!]!
    excludedClients: [String!]!
  }

  enum BreakingChangeFormula {
    REQUEST_COUNT
    PERCENTAGE
  }

  input CreateTargetInput {
    organizationSlug: String!
    projectSlug: String!
    slug: String!
  }

  type DeleteTargetPayload {
    selector: TargetSelector!
    deletedTarget: Target!
  }
`;
