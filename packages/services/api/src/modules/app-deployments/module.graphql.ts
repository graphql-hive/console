import { gql } from 'graphql-modules';

export default gql`
  type AppDeployment {
    id: ID!
    name: String!
    version: String!
    documents(first: Int, after: String): GraphQLDocumentConnection
    totalDocumentCount: Int!
    status: AppDeploymentStatus!
    """
    The last time a GraphQL request that used the app deployment was reported.
    """
    lastUsed: DateTime
  }

  extend type Organization {
    isAppDeploymentsEnabled: Boolean!
  }

  enum AppDeploymentStatus {
    pending
    active
    retired
  }

  type GraphQLDocumentConnection {
    pageInfo: PageInfo!
    edges: [GraphQLDocumentEdge!]!
  }

  type GraphQLDocumentEdge {
    cursor: String!
    node: GraphQLDocument!
  }

  type GraphQLDocument {
    hash: String!
    body: String!
    operationName: String
    """
    The internal hash as used for insights.
    """
    insightsHash: String!
  }

  type AppDeploymentConnection {
    pageInfo: PageInfo!
    edges: [AppDeploymentEdge!]!
  }

  type AppDeploymentEdge {
    cursor: String!
    node: AppDeployment!
  }

  extend type Target {
    """
    The app deployments for this target.
    """
    appDeployments(first: Int, after: String): AppDeploymentConnection
    appDeployment(appName: String!, appVersion: String!): AppDeployment
  }

  extend type Mutation {
    createAppDeployment(input: CreateAppDeploymentInput!): CreateAppDeploymentResult!
    addDocumentsToAppDeployment(
      input: AddDocumentsToAppDeploymentInput!
    ): AddDocumentsToAppDeploymentResult!
    activateAppDeployment(input: ActivateAppDeploymentInput!): ActivateAppDeploymentResult!
    retireAppDeployment(input: RetireAppDeploymentInput!): RetireAppDeploymentResult!
  }

  input RetireAppDeploymentInput {
    targetId: ID!
    appName: String!
    appVersion: String!
  }

  type RetireAppDeploymentError implements Error {
    message: String!
  }

  type RetireAppDeploymentOk {
    retiredAppDeployment: AppDeployment!
  }

  type RetireAppDeploymentResult {
    error: RetireAppDeploymentError
    ok: RetireAppDeploymentOk
  }

  input CreateAppDeploymentInput {
    appName: String!
    appVersion: String!
  }

  type CreateAppDeploymentErrorDetails {
    """
    Error message for the input app name.
    """
    appName: String
    """
    Error message for the input app version.
    """
    appVersion: String
  }

  type CreateAppDeploymentError implements Error {
    message: String!
    details: CreateAppDeploymentErrorDetails
  }

  type CreateAppDeploymentOk {
    createdAppDeployment: AppDeployment!
  }

  type CreateAppDeploymentResult {
    error: CreateAppDeploymentError
    ok: CreateAppDeploymentOk
  }

  input AppDeploymentOperation {
    """
    GraphQL operation hash.
    """
    hash: String!
    """
    GraphQL operation body.
    """
    body: String!
  }

  input DocumentInput {
    """
    GraphQL operation hash.
    """
    hash: String!
    """
    GraphQL operation body.
    """
    body: String!
  }

  input AddDocumentsToAppDeploymentInput {
    """
    Name of the app.
    """
    appName: String!
    """
    The version of the app
    """
    appVersion: String!
    """
    A list of operations to add to the app deployment. (max 100 per single batch)
    """
    documents: [DocumentInput!]!
  }

  type AddDocumentsToAppDeploymentErrorDetails {
    """
    Index of the document sent from the client.
    """
    index: Int!
    """
    Error message for the document at the given index.
    """
    message: String!
  }

  type AddDocumentsToAppDeploymentError implements Error {
    message: String!
    """
    Optional details if the error is related to a specific document.
    """
    details: AddDocumentsToAppDeploymentErrorDetails
  }

  type AddDocumentsToAppDeploymentOk {
    appDeployment: AppDeployment!
  }

  type AddDocumentsToAppDeploymentResult {
    error: AddDocumentsToAppDeploymentError
    ok: AddDocumentsToAppDeploymentOk
  }

  input ActivateAppDeploymentInput {
    appName: String!
    appVersion: String!
  }

  type ActivateAppDeploymentError implements Error {
    message: String!
  }

  type ActivateAppDeploymentOk {
    activatedAppDeployment: AppDeployment!
    """
    Whether the app deployment activation was skipped because it is already activated.
    """
    isSkipped: Boolean!
  }

  type ActivateAppDeploymentResult {
    error: ActivateAppDeploymentError
    ok: ActivateAppDeploymentOk
  }
`;
