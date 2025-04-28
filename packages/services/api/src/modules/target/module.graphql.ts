import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    target(reference: TargetReferenceInput! @tag(name: "public")): Target @tag(name: "public")
    targets(selector: ProjectSelectorInput!): TargetConnection!
  }

  extend type Mutation {
    """
    Create a new target within an existing project.
    """
    createTarget(input: CreateTargetInput! @tag(name: "public")): CreateTargetResult!
      @tag(name: "public")
    """
    Delete a target.
    """
    deleteTarget(input: DeleteTargetInput! @tag(name: "public")): DeleteTargetResult!
      @tag(name: "public")
    """
    Update the slug of a traget.
    """
    updateTargetSlug(input: UpdateTargetSlugInput!): UpdateTargetSlugResult!
    """
    Update the conditional breaking change configuration of a target.
    """
    updateTargetConditionalBreakingChangeConfiguration(
      input: UpdateTargetConditionalBreakingChangeConfigurationInput! @tag(name: "public")
    ): UpdateTargetConditionalBreakingChangeConfigurationResult! @tag(name: "public")
    """
    Updates the target's explorer endpoint url.
    """
    updateTargetGraphQLEndpointUrl(
      input: UpdateTargetGraphQLEndpointUrlInput! @tag(name: "public")
    ): UpdateTargetGraphQLEndpointUrlResult! @tag(name: "public")
    """
    Update the targets dangerous change classification settings.
    This allows dangerous changes fail schema checks.
    """
    updateTargetDangerousChangeClassification(
      input: UpdateTargetDangerousChangeClassificationInput! @tag(name: "public")
    ): UpdateTargetDangerousChangeClassificationResult! @tag(name: "public")
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
    target: TargetReferenceInput! @tag(name: "public")
    graphqlEndpointUrl: String @tag(name: "public")
  }

  input UpdateTargetDangerousChangeClassificationInput {
    target: TargetReferenceInput! @tag(name: "public")
    failDiffOnDangerousChange: Boolean! @tag(name: "public")
  }

  type UpdateTargetDangerousChangeClassificationResultOk {
    target: Target! @tag(name: "public")
  }

  type UpdateTargetDangerousChangeClassificationResultError {
    message: String! @tag(name: "public")
  }

  type UpdateTargetDangerousChangeClassificationResult {
    ok: UpdateTargetDangerousChangeClassificationResultOk @tag(name: "public")
    error: UpdateTargetDangerousChangeClassificationResultError @tag(name: "public")
  }

  type UpdateTargetGraphQLEndpointUrlResultOk {
    target: Target! @tag(name: "public")
  }

  type UpdateTargetGraphQLEndpointUrlResultError {
    message: String! @tag(name: "public")
  }

  type UpdateTargetGraphQLEndpointUrlResult {
    ok: UpdateTargetGraphQLEndpointUrlResultOk @tag(name: "public")
    error: UpdateTargetGraphQLEndpointUrlResultError @tag(name: "public")
  }

  input UpdateTargetSlugInput {
    target: TargetReferenceInput! @tag(name: "public")
    slug: String! @tag(name: "public")
  }

  type UpdateTargetSlugResult {
    ok: UpdateTargetSlugResultOk @tag(name: "public")
    error: UpdateTargetSlugResultError @tag(name: "public")
  }

  type UpdateTargetSlugResultOk {
    selector: TargetSelector! @tag(name: "public")
    target: Target! @tag(name: "public")
  }

  type UpdateTargetSlugResultError {
    message: String! @tag(name: "public")
  }

  type CreateTargetResult {
    ok: CreateTargetResultOk @tag(name: "public")
    error: CreateTargetResultError @tag(name: "public")
  }

  type CreateTargetInputErrors {
    slug: String
  }

  type CreateTargetResultError {
    message: String! @tag(name: "public")
    inputErrors: CreateTargetInputErrors!
  }

  type CreateTargetResultOk {
    selector: TargetSelector!
    createdTarget: Target! @tag(name: "public")
  }

  input DeleteTargetInput {
    """
    Reference to the target that should be deleted.
    """
    target: TargetReferenceInput! @tag(name: "public")
  }

  type DeleteTargetResult {
    ok: DeleteTargetResultOk @tag(name: "public")
    error: DeleteTargetResultError @tag(name: "public")
  }

  type DeleteTargetResultOk {
    deletedTargetId: ID! @tag(name: "public")
  }

  type DeleteTargetResultError {
    message: String! @tag(name: "public")
  }

  input TargetSelectorInput {
    organizationSlug: String! @tag(name: "public")
    projectSlug: String! @tag(name: "public")
    targetSlug: String! @tag(name: "public")
  }

  """
  Reference to a target.
  """
  input TargetReferenceInput @oneOf {
    """
    Reference to a target using it's ID (see "Target.id" field).
    """
    byId: ID @tag(name: "public")
    """
    Reference to a target using it's slug parts (see "Organization.slug", "Project.slug", "Target.slug").
    """
    bySelector: TargetSelectorInput @tag(name: "public")
  }

  """
  Fields not provided (omitted) will retain the previous value.
  """
  input ConditionalBreakingChangeConfigurationInput {
    """
    Update whethe the conditional breaking change detection is enabled or disabled.
    """
    isEnabled: Boolean @tag(name: "public")
    """
    The period in days. Operations of the last x days will be used for the conditional breaking change detection.
    The maximum value depends on the organizations data retention limits.
    """
    period: Int @tag(name: "public")
    """
    Whether a percentage or absolute value should be used for the conditional breaking changes treshold.
    """
    breakingChangeFormula: BreakingChangeFormulaType @tag(name: "public")
    """
    The percentage value if \`UpdateTargetValidationSettingsInput.breakingChangeFormula\` is set to \`BreakingChangeFormulaType.PERCENTAGE\`.
    """
    percentage: Float @tag(name: "public")
    """
    The request count value if \`UpdateTargetValidationSettingsInput.breakingChangeFormula\` is set to \`BreakingChangeFormulaType.REQUEST_COUNT\`.
    """
    requestCount: Int @tag(name: "public")
    """
    List of target ids within the same project, whose operations are used for the breaking change detection.
    """
    targetIds: [ID!] @tag(name: "public")
    """
    List of client names that are excluded from the breaking change detection.
    """
    excludedClients: [String!] @tag(name: "public")
  }

  input UpdateTargetConditionalBreakingChangeConfigurationInput {
    """
    The target on which the settings are adjusted.
    """
    target: TargetReferenceInput! @tag(name: "public")
    """
    Updates to the conditional breaking change configuration.
    """
    conditionalBreakingChangeConfiguration: ConditionalBreakingChangeConfigurationInput!
      @tag(name: "public")
  }

  type UpdateTargetConditionalBreakingChangeConfigurationResult {
    ok: UpdateTargetConditionalBreakingChangeConfigurationResultOk @tag(name: "public")
    error: UpdateTargetConditionalBreakingChangeConfigurationResultError @tag(name: "public")
  }

  type UpdateTargetConditionalBreakingChangeConfigurationInputErrors {
    percentage: String
    period: String
    requestCount: String
  }

  type UpdateTargetConditionalBreakingChangeConfigurationResultError {
    message: String! @tag(name: "public")
    inputErrors: UpdateTargetConditionalBreakingChangeConfigurationInputErrors!
  }

  type UpdateTargetConditionalBreakingChangeConfigurationResultOk {
    target: Target! @tag(name: "public")
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
    id: ID! @tag(name: "public")
    slug: String! @tag(name: "public")
    cleanId: ID! @deprecated(reason: "Use the 'slug' field instead.")
    name: String! @deprecated(reason: "Use the 'slug' field instead.")
    project: Project!
    """
    The endpoint url of the target's explorer instance.
    """
    graphqlEndpointUrl: String
    """
    Whether a dangerous change fails a schema check and requires a manual approval.
    """
    failDiffOnDangerousChange: Boolean! @tag(name: "public")
    """
    Configuration for conditional breaking change detection.
    """
    conditionalBreakingChangeConfiguration: ConditionalBreakingChangeConfiguration!
      @tag(name: "public")
    experimental_forcedLegacySchemaComposition: Boolean!
    viewerCanAccessSettings: Boolean!
    viewerCanModifySettings: Boolean!
    viewerCanModifyTargetAccessToken: Boolean!
    viewerCanModifyCDNAccessToken: Boolean!
    viewerCanDelete: Boolean!
  }

  type ConditionalBreakingChangeConfiguration {
    """
    Whether conditional breaking change detection is enabled.
    """
    isEnabled: Boolean! @tag(name: "public")
    """
    The period in days. Operations of the last x days will be used for the conditional breaking change detection.
    """
    period: Int! @tag(name: "public")
    """
    If TargetValidationSettings.breakingChangeFormula is PERCENTAGE, then this
    is the percent of the total operations over the TargetValidationSettings.period
    required for a change to be considered breaking.
    """
    percentage: Float! @tag(name: "public")
    """
    If TargetValidationSettings.breakingChangeFormula is REQUEST_COUNT, then this
    is the total number of operations over the TargetValidationSettings.period
    required for a change to be considered breaking.
    """
    requestCount: Int! @tag(name: "public")
    """
    Determines which formula is used to determine if a change is considered breaking
    or not. Only one formula can be used at a time.
    """
    breakingChangeFormula: BreakingChangeFormulaType! @tag(name: "public")
    """
    List of target within the same project, whose operations are used for the breaking change detection.
    """
    targets: [Target!]! @tag(name: "public")
    """
    List of client names that are be excluded from the breaking change detection.
    """
    excludedClients: [String!]! @tag(name: "public")
  }

  enum BreakingChangeFormulaType {
    REQUEST_COUNT @tag(name: "public")
    PERCENTAGE @tag(name: "public")
  }

  input CreateTargetInput {
    """
    Reference to the project in which the target should be created in.
    """
    project: ProjectReferenceInput! @tag(name: "public")
    """
    Slug of the target, must be unique per project.
    """
    slug: String! @tag(name: "public")
  }

  type DeleteTargetPayload {
    selector: TargetSelector!
    deletedTarget: Target!
  }
`;
