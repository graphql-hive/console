import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    target(selector: TargetSelectorInput!): Target
    targets(selector: ProjectSelectorInput!): TargetConnection!
  }

  extend type Mutation {
    createTarget(input: CreateTargetInput!): CreateTargetResult!
    updateTargetName(input: UpdateTargetNameInput!): UpdateTargetNameResult!
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
    organization: ID!
    project: ID!
    target: ID!
    nativeComposition: Boolean!
  }

  input UpdateTargetGraphQLEndpointUrlInput {
    organization: ID!
    project: ID!
    target: ID!
    graphqlEndpointUrl: String
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

  type UpdateTargetNameResult {
    ok: UpdateTargetNameOk
    error: UpdateTargetNameError
  }

  type UpdateTargetNameOk {
    selector: TargetSelector!
    updatedTarget: Target!
  }

  type UpdateTargetNameInputErrors {
    name: String
  }

  type UpdateTargetNameError implements Error {
    message: String!
    inputErrors: UpdateTargetNameInputErrors!
  }

  type CreateTargetResult {
    ok: CreateTargetOk
    error: CreateTargetError
  }

  type CreateTargetInputErrors {
    name: String
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
    organization: ID!
    project: ID!
    target: ID!
  }

  input UpdateTargetValidationSettingsInput {
    organization: ID!
    project: ID!
    target: ID!
    period: Int!
    percentage: Float!
    targets: [ID!]!
    excludedClients: [String!]
  }

  type UpdateTargetValidationSettingsResult {
    ok: UpdateTargetValidationSettingsOk
    error: UpdateTargetValidationSettingsError
  }

  type UpdateTargetValidationSettingsInputErrors {
    percentage: String
    period: String
  }

  type UpdateTargetValidationSettingsError implements Error {
    message: String!
    inputErrors: UpdateTargetValidationSettingsInputErrors!
  }

  type UpdateTargetValidationSettingsOk {
    target: Target!
  }

  input SetTargetValidationInput {
    organization: ID!
    project: ID!
    target: ID!
    enabled: Boolean!
  }

  type TargetSelector {
    organization: ID!
    project: ID!
    target: ID!
  }

  extend type Project {
    targets: TargetConnection!
  }

  type TargetConnection {
    nodes: [Target!]!
    total: Int!
  }

  type Target {
    id: ID!
    cleanId: ID!
    name: String!
    project: Project!
    """
    The endpoint url of the target's explorer instance.
    """
    graphqlEndpointUrl: String
    validationSettings: TargetValidationSettings!
    experimental_forcedLegacySchemaComposition: Boolean!
  }

  type TargetValidationSettings {
    enabled: Boolean!
    period: Int!
    percentage: Float!
    targets: [Target!]!
    excludedClients: [String!]!
  }

  input CreateTargetInput {
    organization: ID!
    project: ID!
    name: String!
  }

  input UpdateTargetNameInput {
    organization: ID!
    project: ID!
    target: ID!
    name: String!
  }

  type DeleteTargetPayload {
    selector: TargetSelector!
    deletedTarget: Target!
  }
`;
