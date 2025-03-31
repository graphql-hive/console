import { gql } from 'graphql-modules';

export default gql`
  extend type Mutation {
    schemaPublish(input: SchemaPublishInput!): SchemaPublishPayload!
    schemaCheck(input: SchemaCheckInput!): SchemaCheckPayload!
    schemaDelete(input: SchemaDeleteInput!): SchemaDeleteResult!
    schemaCompose(input: SchemaComposeInput!): SchemaComposePayload!

    updateBaseSchema(input: UpdateBaseSchemaInput!): UpdateBaseSchemaResult!
    updateNativeFederation(input: UpdateNativeFederationInput!): UpdateNativeFederationResult!
    enableExternalSchemaComposition(
      input: EnableExternalSchemaCompositionInput!
    ): EnableExternalSchemaCompositionResult!
    disableExternalSchemaComposition(
      input: DisableExternalSchemaCompositionInput!
    ): DisableExternalSchemaCompositionResult!
    """
    Approve a failed schema check with breaking changes.
    """
    approveFailedSchemaCheck(input: ApproveFailedSchemaCheckInput!): ApproveFailedSchemaCheckResult!
    """
    Create a contract for a given target.
    """
    createContract(input: CreateContractInput!): CreateContractResult!
    """
    Disable a contract.
    """
    disableContract(input: DisableContractInput!): DisableContractResult!
  }

  extend type Query {
    schemaVersionForActionId(actionId: ID!, target: TargetReferenceInput): SchemaVersion
    latestValidVersion(target: TargetReferenceInput): SchemaVersion
    """
    Requires API Token
    """
    latestVersion: SchemaVersion
    testExternalSchemaComposition(
      selector: TestExternalSchemaCompositionInput!
    ): TestExternalSchemaCompositionResult!
  }

  input UpdateNativeFederationInput {
    organizationSlug: String!
    projectSlug: String!
    enabled: Boolean!
  }

  """
  @oneOf
  """
  type UpdateNativeFederationResult {
    ok: Project
    error: UpdateNativeFederationError
  }

  type UpdateNativeFederationError implements Error {
    message: String!
  }

  input DisableExternalSchemaCompositionInput {
    organizationSlug: String!
    projectSlug: String!
  }

  """
  @oneOf
  """
  type DisableExternalSchemaCompositionResult {
    ok: Project
    error: String
  }

  input EnableExternalSchemaCompositionInput {
    organizationSlug: String!
    projectSlug: String!
    endpoint: String!
    secret: String!
  }

  """
  @oneOf
  """
  type EnableExternalSchemaCompositionResult {
    ok: Project
    error: EnableExternalSchemaCompositionError
  }

  type ExternalSchemaComposition {
    endpoint: String!
  }

  input TestExternalSchemaCompositionInput {
    organizationSlug: String!
    projectSlug: String!
  }

  """
  @oneOf
  """
  type TestExternalSchemaCompositionResult {
    ok: Project
    error: TestExternalSchemaCompositionError
  }

  type TestExternalSchemaCompositionError implements Error {
    message: String!
  }

  extend type Project {
    externalSchemaComposition: ExternalSchemaComposition
    schemaVersionsCount(period: DateRangeInput): Int!
    isNativeFederationEnabled: Boolean!
    nativeFederationCompatibility: NativeFederationCompatibilityStatus!
  }

  extend type Target {
    schemaVersionsCount(period: DateRangeInput): Int!
  }

  enum NativeFederationCompatibilityStatus {
    COMPATIBLE
    INCOMPATIBLE
    UNKNOWN
    NOT_APPLICABLE
  }

  type EnableExternalSchemaCompositionError implements Error {
    message: String!
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: EnableExternalSchemaCompositionInputErrors!
  }

  type EnableExternalSchemaCompositionInputErrors {
    endpoint: String
    secret: String
  }

  type UpdateBaseSchemaResult {
    ok: UpdateBaseSchemaOk
    error: UpdateBaseSchemaError
  }

  type UpdateBaseSchemaOk {
    updatedTarget: Target!
  }

  type UpdateBaseSchemaError implements Error {
    message: String!
  }

  extend type Target {
    """
    The latest (potentially invalid) schema version.
    """
    latestSchemaVersion: SchemaVersion @tag(name: "public")
    """
    The latest valid (composable) schema version.
    """
    latestValidSchemaVersion: SchemaVersion @tag(name: "public")
    baseSchema: String
    hasSchema: Boolean!
    """
    Get a schema check for the target by ID.
    """
    schemaCheck(id: ID! @tag(name: "public")): SchemaCheck @tag(name: "public")
    """
    Get a list of paginated schema checks for a target.
    """
    schemaChecks(
      first: Int @tag(name: "public")
      after: String @tag(name: "public")
      filters: SchemaChecksFilter
    ): SchemaCheckConnection! @tag(name: "public")
    """
    Paginated list of schema versions, ordered from recent to oldest.
    """
    schemaVersions(first: Int, after: String): SchemaVersionConnection! @tag(name: "public")
    """
    Retreive a specific schema version in this target by it's id.
    """
    schemaVersion(id: ID! @tag(name: "public")): SchemaVersion @tag(name: "public")
    """
    Get a list of paginated schema contracts for the target.
    """
    contracts(first: Int, after: String): ContractConnection!
    """
    Get a list of paginated schema contracts that are active for the target.
    """
    activeContracts(first: Int, after: String): ContractConnection!

    """
    Whether any subscription operations were reported for this target.
    """
    hasCollectedSubscriptionOperations: Boolean!
  }

  input SchemaChecksFilter {
    failed: Boolean
    changed: Boolean
  }

  type SchemaConnection {
    nodes: [Schema!]! @deprecated(reason: "Use 'SchemaConnection.edges' instead.")
    total: Int! @deprecated(reason: "This field will be removed.")
    edges: [SchemaEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type SchemaEdge {
    cursor: String! @tag(name: "public")
    node: Schema! @tag(name: "public")
  }

  union RegistryLog @tag(name: "public") = PushedSchemaLog | DeletedSchemaLog

  type PushedSchemaLog {
    id: ID!
    author: String!
    date: DateTime!
    commit: ID!
    """
    The name of the service that got published.
    """
    service: String @tag(name: "public")
    """
    The serviceSDL of the pushed schema. Is null for single schema projects.
    """
    serviceSdl: String @tag(name: "public")
    """
    The previous SDL of the pushed schema. Is null for single schema projects.
    """
    previousServiceSdl: String @tag(name: "public")
  }

  type DeletedSchemaLog {
    id: ID!
    date: DateTime!
    """
    The name of the service that got deleted.
    """
    deletedService: String! @tag(name: "public")
    """
    The previous SDL of the full schema or subgraph.
    """
    previousServiceSdl: String @tag(name: "public")
  }

  union Schema @tag(name: "public") = SingleSchema | CompositeSchema

  type SingleSchema {
    id: ID!
    author: String! @tag(name: "public")
    source: String! @tag(name: "public")
    date: DateTime!
    commit: ID! @tag(name: "public")
    metadata: String
  }

  type CompositeSchema {
    id: ID!
    author: String! @tag(name: "public")
    source: String! @tag(name: "public")
    date: DateTime!
    commit: ID! @tag(name: "public")
    url: String @tag(name: "public")
    service: String @tag(name: "public")
    metadata: String
  }

  union SchemaPublishPayload =
    | SchemaPublishSuccess
    | SchemaPublishRetry
    | SchemaPublishError
    | SchemaPublishMissingServiceError
    | SchemaPublishMissingUrlError
    | GitHubSchemaPublishSuccess
    | GitHubSchemaPublishError

  input SchemaPublishGitHubInput {
    """
    The repository name.
    """
    repository: String!
    """
    The commit sha.
    """
    commit: String!
  }

  input SchemaPublishInput {
    target: TargetReferenceInput
    service: ID
    url: String
    sdl: String!
    author: String!
    commit: String!
    force: Boolean @deprecated(reason: "Enabled by default for newly created projects")
    """
    Accept breaking changes and mark schema as valid (if composable)
    """
    experimental_acceptBreakingChanges: Boolean
      @deprecated(reason: "Enabled by default for newly created projects")
    metadata: String
    """
    Talk to GitHub Application and create a check-run
    """
    github: Boolean @deprecated(reason: "Use SchemaPublishInput.gitHub instead.")
    """
    Link GitHub version to a GitHub commit on a repository.
    """
    gitHub: SchemaPublishGitHubInput
    """
    Whether the CLI supports retrying the schema publish, in case acquiring the schema publish lock fails due to a busy queue.
    """
    supportsRetry: Boolean = false
  }

  input SchemaComposeInput {
    target: TargetReferenceInput
    services: [SchemaComposeServiceInput!]!
    """
    Whether to use the latest composable version or just latest schema version for the composition.
    Latest schema version may or may not be composable.
    It's true by default, which means the latest composable schema version is used.
    """
    useLatestComposableVersion: Boolean = true
  }

  input SchemaComposeServiceInput {
    name: String!
    sdl: String!
    url: String
  }

  union SchemaComposePayload = SchemaComposeSuccess | SchemaComposeError

  type SchemaComposeSuccess {
    valid: Boolean!
    compositionResult: SchemaCompositionResult!
  }

  """
  @oneOf
  """
  type SchemaCompositionResult {
    supergraphSdl: String
    errors: SchemaErrorConnection
  }

  type SchemaComposeError implements Error {
    message: String!
  }

  union SchemaCheckPayload =
    | SchemaCheckSuccess
    | SchemaCheckError
    | GitHubSchemaCheckSuccess
    | GitHubSchemaCheckError

  union SchemaDeleteResult = SchemaDeleteSuccess | SchemaDeleteError

  type SchemaDeleteSuccess {
    valid: Boolean!
    changes: SchemaChangeConnection
    errors: SchemaErrorConnection!
  }

  type SchemaDeleteError {
    valid: Boolean!
    errors: SchemaErrorConnection!
  }

  enum CriticalityLevel {
    Breaking @deprecated(reason: "Use 'SeverityLevelType' instead.")
    Dangerous @deprecated(reason: "Use 'SeverityLevelType' instead.")
    Safe @deprecated(reason: "Use 'SeverityLevelType' instead.")
  }

  """
  Describes the impact of a schema change.
  """
  enum SeverityLevelType {
    """
    The change is safe and does not break existing clients.
    """
    SAFE @tag(name: "public")
    """
    The change might break existing clients that do not follow
    best-practises such as future-proof enums or future-proof interface/union type usages.
    """
    DANGEROUS @tag(name: "public")
    """
    The change will definetly break GraphQL client users.
    """
    BREAKING @tag(name: "public")
  }

  """
  Describes a schema change for either a schema version (\`SchemaVersion\`) or schema check (\`SchemaCheck\`).
  """
  type SchemaChange {
    criticality: CriticalityLevel! @deprecated(reason: "Use 'SchemaChange.severityLevel' instead.")
    criticalityReason: String @deprecated(reason: "Use 'SchemaChange.severityReason' instead.")
    """
    The severity level of this schema change.
    Note: A schema change with the impact \`SeverityLevelType.BREAKING\` can still be safe based on the usage (\`SchemaChange.isSafeBasedOnUsage\`).
    """
    severityLevel: SeverityLevelType! @tag(name: "public")
    """
    The reason for the schema changes severity level (\`SchemaChange.severityLevel\`)
    """
    severityReason: String @tag(name: "public")
    """
    Message describing the schema change.
    """
    message(
      """
      Whether to include a note about the safety of the change based on usage data within the message.
      """
      withSafeBasedOnUsageNote: Boolean = true
    ): String! @tag(name: "public")
    path: [String!]
    """
    Approval metadata for this schema change.
    This field is populated in case the breaking change was manually approved.
    """
    approval: SchemaChangeApproval
    """
    Whether the breaking change is safe based on usage data.
    """
    isSafeBasedOnUsage: Boolean! @tag(name: "public")
    """
    Usage statistics about the schema change if it is not safe based on usage.
    The statistics are determined based on the breaking change configuration.
    The usage statistics are only available for breaking changes and only represent a snapshot of the usage data at the time of the schema check/schema publish.
    """
    usageStatistics: SchemaChangeUsageStatistics @tag(name: "public")
  }

  type SchemaChangeUsageStatistics {
    """
    List of the top operations that are affected by this schema change.
    """
    topAffectedOperations: [SchemaChangeUsageStatisticsAffectedOperation!]! @tag(name: "public")
    """
    List of top clients that are affected by this schema change.
    """
    topAffectedClients: [SchemaChangeUsageStatisticsAffectedClient!]! @tag(name: "public")
  }

  type SchemaChangeUsageStatisticsAffectedOperation {
    """
    Name of the operation.
    """
    name: String! @tag(name: "public")
    """
    Hash of the operation.
    """
    hash: String! @tag(name: "public")
    """
    The number of times the operation was called in the period.
    """
    count: Float! @tag(name: "public")
    """
    Human readable count value.
    """
    countFormatted: String!
    """
    The percentage share of the operation of the total traffic.
    """
    percentage: Float! @tag(name: "public")
    """
    Human readable percentage value.
    """
    percentageFormatted: String!
  }

  type SchemaChangeUsageStatisticsAffectedClient {
    """
    Name of the client.
    """
    name: String! @tag(name: "public")
    """
    The number of times the client called the operation in the period.
    """
    count: Float! @tag(name: "public")
    """
    Human readable count value.
    """
    countFormatted: String!
    """
    The percentage share of the client of the total traffic.
    """
    percentage: Float! @tag(name: "public")
    """
    Human readable percentage value.
    """
    percentageFormatted: String!
  }

  type SchemaChangeApproval {
    """
    User that approved this schema change.
    """
    approvedBy: User
    """
    Date of the schema change approval.
    """
    approvedAt: DateTime!
    """
    ID of the schema check in which this change was first approved.
    """
    schemaCheckId: ID!
  }

  type SchemaError {
    message: String! @tag(name: "public")
    path: [String!]
  }

  type SchemaChangeConnection {
    nodes: [SchemaChange!]! @deprecated(reason: "Use 'SchemaChangeConnection.edges' instead.")
    total: Int! @deprecated(reason: "This field will be removed in the future.")
    edges: [SchemaChangeEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type SchemaChangeEdge {
    cursor: String! @tag(name: "public")
    node: SchemaChange! @tag(name: "public")
  }

  type SchemaErrorConnection {
    nodes: [SchemaError!]! @deprecated(reason: "Use 'SchemaErrorConnection.edges' instead.")
    total: Int! @deprecated(reason: "This field will be removed in the future.")
    edges: [SchemaErrorEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type SchemaErrorEdge {
    cursor: String! @tag(name: "public")
    node: SchemaError! @tag(name: "public")
  }

  type SchemaWarningConnection {
    nodes: [SchemaCheckWarning!]!
    total: Int!
  }

  type BreakingChangeMetadataTarget {
    slug: String! @tag(name: "public")
    id: ID! @tag(name: "public")
    target: Target @tag(name: "public")
  }

  type SchemaCheckConditionalBreakingChangeMetadataSettings {
    retentionInDays: Int! @tag(name: "public")
    percentage: Float! @tag(name: "public")
    excludedClientNames: [String!] @tag(name: "public")
    targets: [BreakingChangeMetadataTarget!]! @tag(name: "public")
  }

  type SchemaCheckConditionalBreakingChangeMetadataUsage {
    """
    Total amount of requests for the settings and period.
    """
    totalRequestCount: Float! @tag(name: "public")
    """
    Total request count human readable.
    """
    totalRequestCountFormatted: String!
  }

  type SchemaCheckConditionalBreakingChangeMetadata {
    period: DateRange! @tag(name: "public")
    settings: SchemaCheckConditionalBreakingChangeMetadataSettings!
    usage: SchemaCheckConditionalBreakingChangeMetadataUsage! @tag(name: "public")
  }

  type SchemaCheckSuccess {
    valid: Boolean!
    initial: Boolean!
    changes: SchemaChangeConnection
    warnings: SchemaWarningConnection
    schemaCheck: SchemaCheck
  }

  type SchemaCheckWarning {
    message: String!
    source: String
    line: Int
    column: Int
  }

  type SchemaCheckError {
    valid: Boolean!
    changes: SchemaChangeConnection
    errors: SchemaErrorConnection!
    warnings: SchemaWarningConnection
    schemaCheck: SchemaCheck
  }

  type GitHubSchemaCheckSuccess {
    message: String!
  }

  type GitHubSchemaCheckError {
    message: String!
  }

  type GitHubSchemaPublishSuccess {
    message: String!
  }

  type GitHubSchemaPublishError {
    message: String!
  }

  type SchemaPublishSuccess {
    initial: Boolean!
    valid: Boolean!
    linkToWebsite: String
    message: String
    changes: SchemaChangeConnection
  }

  type SchemaPublishRetry {
    reason: String!
  }

  type SchemaPublishError {
    valid: Boolean!
    linkToWebsite: String
    changes: SchemaChangeConnection
    errors: SchemaErrorConnection!
  }

  type SchemaPublishMissingServiceError {
    message: String!
  }

  type SchemaPublishMissingUrlError {
    message: String!
  }

  input SchemaCheckMetaInput {
    author: String!
    commit: String!
  }

  input SchemaCheckInput {
    target: TargetReferenceInput
    service: ID
    sdl: String!
    github: GitHubSchemaCheckInput
    meta: SchemaCheckMetaInput
    """
    Optional context ID to group schema checks together.
    Manually approved breaking changes will be memorized for schema checks with the same context id.
    """
    contextId: String
    """
    Optional url if wanting to show subgraph url changes inside checks.
    """
    url: String
  }

  input SchemaDeleteInput {
    target: TargetReferenceInput
    serviceName: ID!
    dryRun: Boolean
  }

  input GitHubSchemaCheckInput {
    commit: String!
    """
    The repository name of the schema check.
    """
    repository: String
    """
    The pull request number of the schema check.
    """
    pullRequestNumber: String
  }

  input SchemaCompareInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    after: ID!
    before: ID!
  }

  input SchemaVersionUpdateInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    versionId: ID!
    valid: Boolean!
  }

  input UpdateBaseSchemaInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    newBase: String
  }

  type ContractVersionEdge {
    node: ContractVersion! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type ContractVersionConnection {
    edges: [ContractVersionEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type SchemaVersion {
    id: ID! @tag(name: "public")
    """
    A schema version is valid if the composition and contract compositions are successful.
    """
    valid: Boolean! @deprecated(reason: "Use 'SchemaVersion.isValid' instead.")
    """
    A schema version is valid if the composition and contract compositions are successful.
    """
    isValid: Boolean! @tag(name: "public")
    """
    Whether this schema version is composable.
    """
    isComposable: Boolean!
    """
    Whether this schema version has schema changes.
    """
    hasSchemaChanges: Boolean!
    """
    The data on which this schema version was published.
    """
    date: DateTime!
    """
    The log that initiated this schema version.
    For a federation schema this is the published or removed subgraph/service.
    """
    log: RegistryLog! @tag(name: "public")
    baseSchema: String
    """
    The schemas that are composed within this schema version.
    For federation these are the subgraphs/services.
    """
    schemas: SchemaConnection! @tag(name: "public")
    """
    The supergraph SDL for a federation schema.
    """
    supergraph: String @tag(name: "public")
    """
    The (public) schema SDL.
    """
    sdl: String @tag(name: "public")
    """
    List of tags in the schema version. E.g. when using Federation.
    Tags can be used for filtering the schema via contracts.
    """
    tags: [String!]
    """
    Experimental: This field is not stable and may change in the future.
    """
    explorer(usage: SchemaExplorerUsageInput): SchemaExplorer
    unusedSchema(usage: UnusedSchemaExplorerUsageInput): UnusedSchemaExplorer
    deprecatedSchema(usage: DeprecatedSchemaExplorerUsageInput): DeprecatedSchemaExplorer

    schemaCompositionErrors: SchemaErrorConnection @tag(name: "public")

    """
    Schema changes that were introduced in this schema version (compared to the previous version).
    """
    schemaChanges: SchemaChangeConnection @tag(name: "public")

    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection

    """
    GitHub metadata associated with the schema version.
    """
    githubMetadata: SchemaVersionGithubMetadata
    """
    The schema version against which this schema version was compared to in order to determine schema changes.
    """
    previousDiffableSchemaVersion: SchemaVersion
    """
    Whether this is the first composable schema version.
    """
    isFirstComposableVersion: Boolean!
    """
    Contract versions of this schema version.
    """
    contractVersions: ContractVersionConnection @tag(name: "public")
  }

  type SchemaVersionGithubMetadata {
    repository: String!
    commit: String!
  }

  type SchemaVersionEdge {
    node: SchemaVersion! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type SchemaVersionConnection {
    edges: [SchemaVersionEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  input SchemaExplorerUsageInput {
    period: DateRangeInput!
  }

  input UnusedSchemaExplorerUsageInput {
    period: DateRangeInput!
  }

  input DeprecatedSchemaExplorerUsageInput {
    period: DateRangeInput!
  }

  type MetadataAttribute {
    name: String!
    values: [String!]!
  }

  type SchemaExplorer {
    metadataAttributes: [MetadataAttribute!]
    types: [GraphQLNamedType!]!
    type(name: String!): GraphQLNamedType
    query: GraphQLObjectType
    mutation: GraphQLObjectType
    subscription: GraphQLObjectType
  }

  type UnusedSchemaExplorer {
    types: [GraphQLNamedType!]!
  }

  type DeprecatedSchemaExplorer {
    types: [GraphQLNamedType!]!
  }

  type SchemaCoordinateUsage {
    total: Float!
    isUsed: Boolean!
    """
    A list of clients that use this schema coordinate within GraphQL operation documents.
    Is null if used by none clients.
    """
    usedByClients: [String!]
    topOperations(limit: Int!): [SchemaCoordinateUsageOperation!]!
  }

  type SchemaCoordinateUsageOperation {
    name: String!
    hash: String!
    """
    The number of times the operation was called.
    """
    count: Float!
  }

  type SupergraphMetadata {
    metadata: [SchemaMetadata!]
    """
    List of service names that own the field/type.
    Resolves to null if the entity (field, type, scalar) does not belong to any service.
    """
    ownedByServiceNames: [String!]
  }

  type SchemaMetadata {
    """
    The name or key of the metadata. This may not be unique.
    """
    name: String!
    """
    The value of the metadata
    """
    content: String!
    """
    The schema or subgraph name where this metadata originated from.
    """
    source: String
  }

  union GraphQLNamedType =
    | GraphQLObjectType
    | GraphQLInterfaceType
    | GraphQLUnionType
    | GraphQLEnumType
    | GraphQLInputObjectType
    | GraphQLScalarType

  type GraphQLObjectType {
    name: String!
    description: String
    fields: [GraphQLField!]!
    interfaces: [String!]!
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available (e.g. this is not an apollo federation project).
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLInterfaceType {
    name: String!
    description: String
    fields: [GraphQLField!]!
    interfaces: [String!]!
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available.
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLUnionType {
    name: String!
    description: String
    members: [GraphQLUnionTypeMember!]!
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available (e.g. this is not an apollo federation project).
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLUnionTypeMember {
    name: String!
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available (e.g. this is not an apollo federation project).
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLEnumType {
    name: String!
    description: String
    deprecationReason: String
    values: [GraphQLEnumValue!]!
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available.
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLInputObjectType {
    name: String!
    description: String
    fields: [GraphQLInputField!]!
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available (e.g. this is not an apollo federation project).
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLScalarType {
    name: String!
    description: String
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available (e.g. this is not an apollo federation project).
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLField {
    name: String!
    description: String
    type: String!
    args: [GraphQLArgument!]!
    isDeprecated: Boolean!
    deprecationReason: String
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available.
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLInputField {
    name: String!
    description: String
    type: String!
    defaultValue: String
    isDeprecated: Boolean!
    deprecationReason: String
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available (e.g. this is not an apollo federation project).
    """
    supergraphMetadata: SupergraphMetadata
  }

  type GraphQLArgument {
    name: String!
    description: String
    type: String!
    defaultValue: String
    isDeprecated: Boolean!
    deprecationReason: String
    usage: SchemaCoordinateUsage!
  }

  type GraphQLEnumValue {
    name: String!
    description: String
    isDeprecated: Boolean!
    deprecationReason: String
    usage: SchemaCoordinateUsage!
    """
    Metadata specific to Apollo Federation Projects.
    Is null if no meta information is available.
    """
    supergraphMetadata: SupergraphMetadata
  }

  type CodePosition {
    line: Int!
    column: Int!
  }

  type SchemaPolicyWarning {
    message: String!
    ruleId: String
    start: CodePosition
    end: CodePosition
  }

  type SchemaPolicyWarningEdge {
    node: SchemaPolicyWarning!
    cursor: String!
  }

  type SchemaPolicyWarningConnection {
    edges: [SchemaPolicyWarningEdge!]!
    pageInfo: PageInfo!
  }

  type SchemaCheckMeta {
    author: String! @tag(name: "public")
    commit: String! @tag(name: "public")
  }

  interface SchemaCheck {
    id: ID! @tag(name: "public")
    createdAt: String! @tag(name: "public")
    """
    Optional context ID to group schema checks together.
    """
    contextId: String
    """
    The SDL of the schema that was checked.
    """
    schemaSDL: String! @tag(name: "public")
    """
    The previous schema SDL. For composite schemas this is the service.
    """
    previousSchemaSDL: String @tag(name: "public")
    """
    The name of the service that owns the schema. Is null for non composite project types.
    """
    serviceName: String @tag(name: "public")
    """
    Meta information about the schema check.
    """
    meta: SchemaCheckMeta @tag(name: "public")
    """
    The schema version against this check was performed.
    Is null if there is no schema version published yet.
    """
    schemaVersion: SchemaVersion @tag(name: "public")
    """
    The URL of the schema check on the Hive Web App.
    """
    webUrl: String @tag(name: "public")
    """
    The GitHub repository associated with the schema check.
    """
    githubRepository: String

    """
    Whether this schema check has any composition errors.
    """
    hasSchemaCompositionErrors: Boolean!
    """
    Whether this schema check has any breaking changes.
    """
    hasUnapprovedBreakingChanges: Boolean!
    """
    Whether this schema check has any schema changes.
    """
    hasSchemaChanges: Boolean!

    schemaChanges: SchemaChangeConnection @tag(name: "public")
    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection
    schemaPolicyWarnings: SchemaPolicyWarningConnection
    schemaPolicyErrors: SchemaPolicyWarningConnection
    """
    Results of the contracts
    """
    contractChecks: ContractCheckConnection @tag(name: "public")
    """
    Conditional breaking change metadata.
    """
    conditionalBreakingChangeMetadata: SchemaCheckConditionalBreakingChangeMetadata
      @tag(name: "public")
  }

  """
  Schema check result for contracts
  """
  type ContractCheck {
    id: ID!
    contractName: String! @tag(name: "public")

    """
    Whether this schema check has any composition errors.
    """
    hasSchemaCompositionErrors: Boolean!
    """
    Whether this schema check has any breaking changes.
    """
    hasUnapprovedBreakingChanges: Boolean!
    """
    Whether this schema check has any schema changes.
    """
    hasSchemaChanges: Boolean!

    schemaCompositionErrors: SchemaErrorConnection @tag(name: "public")

    schemaChanges: SchemaChangeConnection @tag(name: "public")

    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection

    compositeSchemaSDL: String @tag(name: "public")
    supergraphSDL: String @tag(name: "public")

    isSuccess: Boolean! @tag(name: "public")

    """
    The contract version against this check was performed.
    """
    contractVersion: ContractVersion @tag(name: "public")
  }

  type ContractCheckEdge {
    cursor: String! @tag(name: "public")
    node: ContractCheck! @tag(name: "public")
  }

  type ContractCheckConnection {
    edges: [ContractCheckEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type ContractVersion {
    id: ID!
    createdAt: String!
    contractName: String! @tag(name: "public")

    """
    Whether this contract version is composable.
    """
    isComposable: Boolean! @tag(name: "public")
    schemaCompositionErrors: SchemaErrorConnection @tag(name: "public")

    supergraphSDL: String @tag(name: "public")
    compositeSchemaSDL: String @tag(name: "public")
    """
    Whether this contract versions has schema changes.
    """
    hasSchemaChanges: Boolean!
    """
    Breaking schema changes for this contract version.
    """
    breakingSchemaChanges: SchemaChangeConnection
    """
    Safe schema changes for this contract version.
    """
    safeSchemaChanges: SchemaChangeConnection

    schemaChanges: SchemaChangeConnection @tag(name: "public")

    previousContractVersion: ContractVersion @tag(name: "public")
    previousDiffableContractVersion: ContractVersion @tag(name: "public")

    isFirstComposableVersion: Boolean!
  }

  """
  A successful schema check.
  """
  type SuccessfulSchemaCheck implements SchemaCheck {
    id: ID! @tag(name: "public")
    createdAt: String! @tag(name: "public")
    """
    Optional context ID to group schema checks together.
    """
    contextId: String
    """
    The SDL of the schema that was checked.
    """
    schemaSDL: String! @tag(name: "public")
    """
    The previous schema SDL. For composite schemas this is the service.
    """
    previousSchemaSDL: String @tag(name: "public")
    """
    The name of the service that owns the schema. Is null for non composite project types.
    """
    serviceName: String @tag(name: "public")
    """
    Meta information about the schema check.
    """
    meta: SchemaCheckMeta @tag(name: "public")
    """
    The schema version against this check was performed.
    Is null if there is no schema version published yet.
    """
    schemaVersion: SchemaVersion @tag(name: "public")
    """
    The URL of the schema check on the Hive Web App.
    """
    webUrl: String @tag(name: "public")
    """
    The GitHub repository associated with the schema check.
    """
    githubRepository: String

    """
    Whether this schema check has any composition errors.
    """
    hasSchemaCompositionErrors: Boolean!
    """
    Whether this schema check has any breaking changes.
    """
    hasUnapprovedBreakingChanges: Boolean!
    """
    Whether this schema check has any schema changes.
    """
    hasSchemaChanges: Boolean!

    schemaChanges: SchemaChangeConnection @tag(name: "public")
    """
    Breaking changes can exist in an successful schema check if the check was manually approved.
    """
    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection
    schemaPolicyWarnings: SchemaPolicyWarningConnection
    """
    Schema policy errors can exist in an successful schema check if the check was manually approved.
    """
    schemaPolicyErrors: SchemaPolicyWarningConnection

    compositeSchemaSDL: String
    supergraphSDL: String
    """
    Results of the contracts
    """
    contractChecks: ContractCheckConnection @tag(name: "public")
    """
    Conditional breaking change metadata.
    """
    conditionalBreakingChangeMetadata: SchemaCheckConditionalBreakingChangeMetadata
      @tag(name: "public")

    """
    Whether the schema check was manually approved.
    """
    isApproved: Boolean!
    """
    The user that approved the schema check.
    """
    approvedBy: User
    """
    Comment given when the schema check was approved.
    """
    approvalComment: String
  }

  """
  A failed schema check.
  """
  type FailedSchemaCheck implements SchemaCheck {
    id: ID! @tag(name: "public")
    createdAt: String! @tag(name: "public")
    """
    Optional context ID to group schema checks together.
    """
    contextId: String
    """
    The SDL of the schema that was checked.
    """
    schemaSDL: String! @tag(name: "public")
    """
    The previous schema SDL. For composite schemas this is the service.
    """
    previousSchemaSDL: String @tag(name: "public")
    """
    The name of the service that owns the schema. Is null for non composite project types.
    """
    serviceName: String @tag(name: "public")
    """
    Meta information about the schema check.
    """
    meta: SchemaCheckMeta @tag(name: "public")
    """
    The schema version against this check was performed.
    Is null if there is no schema version published yet.
    """
    schemaVersion: SchemaVersion @tag(name: "public")
    """
    The URL of the schema check on the Hive Web App.
    """
    webUrl: String @tag(name: "public")
    """
    The GitHub repository associated with the schema check.
    """
    githubRepository: String

    compositionErrors: SchemaErrorConnection @tag(name: "public")

    """
    Whether this schema check has any composition errors.
    """
    hasSchemaCompositionErrors: Boolean!
    """
    Whether this schema check has any breaking changes.
    """
    hasUnapprovedBreakingChanges: Boolean!
    """
    Whether this schema check has any schema changes.
    """
    hasSchemaChanges: Boolean!

    schemaChanges: SchemaChangeConnection @tag(name: "public")
    breakingSchemaChanges: SchemaChangeConnection
    safeSchemaChanges: SchemaChangeConnection
    schemaPolicyWarnings: SchemaPolicyWarningConnection
    schemaPolicyErrors: SchemaPolicyWarningConnection

    compositeSchemaSDL: String @tag(name: "public")
    supergraphSDL: String @tag(name: "public")
    """
    Results of the contracts
    """
    contractChecks: ContractCheckConnection @tag(name: "public")
    """
    Conditional breaking change metadata.
    """
    conditionalBreakingChangeMetadata: SchemaCheckConditionalBreakingChangeMetadata
      @tag(name: "public")

    """
    Whether this schema check can be approved manually.
    """
    canBeApproved: Boolean!
    """
    Whether this schema check can be approved by the viewer.
    """
    canBeApprovedByViewer: Boolean!
  }

  type SchemaCheckEdge {
    node: SchemaCheck! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type SchemaCheckConnection {
    edges: [SchemaCheckEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type ContractEdge {
    node: Contract!
    cursor: String!
  }

  type ContractConnection {
    edges: [ContractEdge!]!
    pageInfo: PageInfo!
  }

  input ApproveFailedSchemaCheckInput {
    organizationSlug: String!
    projectSlug: String!
    targetSlug: String!
    schemaCheckId: ID!
    """
    Optional comment visible in the schema check.
    Give a reason why the schema check was approved.
    """
    comment: String
  }

  type ApproveFailedSchemaCheckResult {
    ok: ApproveFailedSchemaCheckOk
    error: ApproveFailedSchemaCheckError
  }

  type ApproveFailedSchemaCheckOk {
    schemaCheck: SchemaCheck!
  }

  type ApproveFailedSchemaCheckError {
    message: String!
  }

  input CreateContractInput {
    targetId: ID!
    contractName: String!
    includeTags: [String!]
    excludeTags: [String!]
    removeUnreachableTypesFromPublicApiSchema: Boolean!
  }

  type CreateContractResult {
    ok: CreateContractResultOk
    error: CreateContractResultError
  }

  type CreateContractResultOk {
    createdContract: Contract!
  }

  type CreateContractResultError implements Error {
    message: String!
    details: CreateContractInputErrors!
  }

  type CreateContractInputErrors {
    targetId: String
    contractName: String
    includeTags: String
    excludeTags: String
  }

  input DisableContractInput {
    contractId: ID!
  }

  type DisableContractResult {
    ok: DisableContractResultOk
    error: DisableContractResultError
  }

  type DisableContractResultOk {
    disabledContract: Contract!
  }

  type DisableContractResultError implements Error {
    message: String!
  }

  type Contract {
    id: ID!
    target: Target!
    contractName: String!
    includeTags: [String!]
    excludeTags: [String!]
    removeUnreachableTypesFromPublicApiSchema: Boolean!
    createdAt: DateTime!
    isDisabled: Boolean!
    viewerCanDisableContract: Boolean!
  }
`;
