import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    target(selector: TargetSelectorInput!): Target
    targets(selector: ProjectSelectorInput!): TargetConnection!
    targetSettings(selector: TargetSelectorInput!): TargetSettings!
  }

  extend type Mutation {
    createTarget(input: CreateTargetInput!): CreateTargetResult!
    updateTargetName(input: UpdateTargetNameInput!): UpdateTargetNameResult!
    deleteTarget(selector: TargetSelectorInput!): DeleteTargetPayload!
    updateTargetValidationSettings(input: UpdateTargetValidationSettingsInput!): UpdateTargetValidationSettingsResult!
    setTargetValidation(input: SetTargetValidationInput!): TargetValidationSettings!
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
    updatedTargetValidationSettings: TargetValidationSettings!
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
  }

  type TargetSettings {
    id: ID!
    validation: TargetValidationSettings!
  }

  type TargetValidationSettings {
    id: ID!
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
