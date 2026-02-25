import { gql } from 'graphql-modules';

export default gql`
  type AppDeployment {
    id: ID! @tag(name: "public")
    name: String! @tag(name: "public")
    version: String! @tag(name: "public")
    documents(
      first: Int
      after: String
      filter: AppDeploymentDocumentsFilterInput
    ): GraphQLDocumentConnection
    totalDocumentCount: Int!
    status: AppDeploymentStatus!
    """
    The timestamp when the app deployment was created.
    """
    createdAt: DateTime! @tag(name: "public")
    """
    The timestamp when the app deployment was activated.
    """
    activatedAt: DateTime @tag(name: "public")
    """
    The timestamp when the app deployment was retired. Only present for retired deployments.
    """
    retiredAt: DateTime @tag(name: "public")
    """
    The last time a GraphQL request that used the app deployment was reported.
    """
    lastUsed: DateTime @tag(name: "public")
  }

  extend type Organization {
    isAppDeploymentsEnabled: Boolean!
  }

  enum AppDeploymentStatus {
    pending
    active
    retired
  }

  """
  Storage format for app deployment documents.
  """
  enum AppDeploymentFormatType {
    """
    V1 format: version-scoped storage. Each version stores documents separately.
    Allows any hash format. No cross-version deduplication.
    """
    V1
    """
    V2 format: content-addressed storage with SHA256 hashes.
    Enables cross-version deduplication and delta uploads.
    """
    V2
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
    pageInfo: PageInfo! @tag(name: "public")
    edges: [AppDeploymentEdge!]! @tag(name: "public")
  }

  type AppDeploymentEdge {
    cursor: String! @tag(name: "public")
    node: AppDeployment! @tag(name: "public")
  }

  input AppDeploymentDocumentsFilterInput {
    operationName: String
    """
    Filter documents that use any of the specified schema coordinates.
    """
    schemaCoordinates: [String!]
  }

  """
  Filter options for querying active app deployments.
  The date filters (lastUsedBefore, neverUsedAndCreatedBefore) use OR semantics:
  a deployment is included if it matches either date condition.
  If no date filters are provided, all active deployments are returned.
  """
  input ActiveAppDeploymentsFilter {
    """
    Filter by app deployment name. Case-insensitive partial match.
    Applied with AND semantics to narrow down results.
    """
    name: String @tag(name: "public")
    """
    Returns deployments that were last used before the given timestamp.
    Useful for identifying stale or inactive deployments that have been used
    at least once but not recently.
    """
    lastUsedBefore: DateTime @tag(name: "public")
    """
    Returns deployments that have never been used and were created before
    the given timestamp. Useful for identifying old, unused deployments
    that may be candidates for cleanup.
    """
    neverUsedAndCreatedBefore: DateTime @tag(name: "public")
  }

  extend type Target {
    """
    The app deployments for this target.
    """
    appDeployments(first: Int, after: String): AppDeploymentConnection
    appDeployment(appName: String!, appVersion: String!): AppDeployment
    """
    Whether the viewer can access the app deployments within a target.
    """
    viewerCanViewAppDeployments: Boolean!
    """
    Find active app deployments matching specific criteria.
    Date filter conditions (lastUsedBefore, neverUsedAndCreatedBefore) use OR semantics.
    If no date filters are provided, all active deployments are returned.
    The name filter uses AND semantics to narrow results.
    Only active deployments are returned (not pending or retired).
    """
    activeAppDeployments(
      first: Int @tag(name: "public")
      after: String @tag(name: "public")
      filter: ActiveAppDeploymentsFilter! @tag(name: "public")
    ): AppDeploymentConnection! @tag(name: "public")
    """
    Get list of document hashes that already exist for this app (across all versions).
    Used for delta uploads - CLI can skip uploading documents that already exist.
    """
    appDeploymentDocumentHashes(appName: String!): AppDeploymentDocumentHashesResult!
  }

  type AppDeploymentDocumentHashesResult {
    ok: AppDeploymentDocumentHashesOk
    error: AppDeploymentDocumentHashesError
  }

  type AppDeploymentDocumentHashesOk {
    """
    List of document hashes that already exist for this app.
    """
    hashes: [String!]!
  }

  type AppDeploymentDocumentHashesError implements Error {
    message: String!
  }

  extend type Mutation {
    createAppDeployment(input: CreateAppDeploymentInput!): CreateAppDeploymentResult!
    addDocumentsToAppDeployment(
      input: AddDocumentsToAppDeploymentInput!
    ): AddDocumentsToAppDeploymentResult!
    activateAppDeployment(input: ActivateAppDeploymentInput!): ActivateAppDeploymentResult!
    retireAppDeployment(
      input: RetireAppDeploymentInput! @tag(name: "public")
    ): RetireAppDeploymentResult! @tag(name: "public")
  }

  input RetireAppDeploymentInput {
    """
    If using an organization access token, then a target must be provided.
    If using a target's access token, then this should be null.
    """
    target: TargetReferenceInput @tag(name: "public")

    """
    The identifying application name
    """
    appName: String! @tag(name: "public")

    """
    The exact version of the application to retire
    """
    appVersion: String! @tag(name: "public")

    """
    Force retirement even if protection rules would prevent it. Disabled by default.
    """
    force: Boolean! = false @tag(name: "public")
  }

  """
  Details about why protection prevented retirement.
  """
  type AppDeploymentProtectionBlockDetails {
    """
    The last time the app deployment was used.
    """
    lastUsed: DateTime @tag(name: "public")
    """
    Days since the app deployment was last used.
    """
    daysSinceLastUsed: Int @tag(name: "public")
    """
    Required minimum days of inactivity.
    """
    requiredMinDaysInactive: Int! @tag(name: "public")
    """
    Current traffic percentage of this app deployment.
    """
    currentTrafficPercentage: Float @tag(name: "public")
    """
    Maximum traffic percentage allowed for retirement.
    """
    maxTrafficPercentage: Float! @tag(name: "public")
  }

  type RetireAppDeploymentError implements Error {
    message: String! @tag(name: "public")
    """
    Details about why protection prevented retirement.
    Only present when retirement was blocked due to protection rules.
    """
    protectionDetails: AppDeploymentProtectionBlockDetails @tag(name: "public")
  }

  type RetireAppDeploymentOk {
    retiredAppDeployment: AppDeployment! @tag(name: "public")
  }

  type RetireAppDeploymentResult {
    error: RetireAppDeploymentError @tag(name: "public")
    ok: RetireAppDeploymentOk @tag(name: "public")
  }

  input CreateAppDeploymentInput {
    target: TargetReferenceInput
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
    target: TargetReferenceInput
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
    """
    Storage format for documents. Defaults to V1 for backwards compatibility.
    V2 enables cross-version deduplication and delta uploads (requires SHA256 hashes).
    """
    format: AppDeploymentFormatType
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

  """
  Timing breakdown for document upload operations. All time values are in milliseconds.
  """
  type DocumentUploadTiming {
    """
    Total elapsed time for the entire batch processing.
    """
    totalMs: Int!
    """
    Time spent parsing GraphQL documents.
    """
    parsingMs: Int!
    """
    Time spent validating documents against the schema.
    """
    validationMs: Int!
    """
    Time spent extracting schema coordinates from documents.
    """
    coordinateExtractionMs: Int!
    """
    Time spent inserting records into ClickHouse.
    """
    clickhouseMs: Int!
    """
    Time spent uploading documents to S3.
    """
    s3Ms: Int!
    """
    Number of documents successfully processed.
    """
    documentsProcessed: Int!
  }

  type AddDocumentsToAppDeploymentOk {
    appDeployment: AppDeployment!
    timing: DocumentUploadTiming
  }

  type AddDocumentsToAppDeploymentResult {
    error: AddDocumentsToAppDeploymentError
    ok: AddDocumentsToAppDeploymentOk
  }

  input ActivateAppDeploymentInput {
    target: TargetReferenceInput
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
