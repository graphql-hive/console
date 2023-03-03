import { gql } from 'graphql-modules';

export default gql`
  extend type Mutation {
    """
    Requires API Token
    """
    schemaPublish(input: SchemaPublishInput!): SchemaPublishPayload!
    """
    Requires API Token
    """
    schemaCheck(input: SchemaCheckInput!): SchemaCheckPayload!
    """
    Requires API Token
    """
    schemaDelete(input: SchemaDeleteInput!): SchemaDeleteResult!
    updateSchemaVersionStatus(input: SchemaVersionUpdateInput!): SchemaVersion!
    updateBaseSchema(input: UpdateBaseSchemaInput!): UpdateBaseSchemaResult!
    enableExternalSchemaComposition(
      input: EnableExternalSchemaCompositionInput!
    ): EnableExternalSchemaCompositionResult!
    disableExternalSchemaComposition(
      input: DisableExternalSchemaCompositionInput!
    ): DisableExternalSchemaCompositionResult!
    updateProjectRegistryModel(
      input: UpdateProjectRegistryModelInput!
    ): UpdateProjectRegistryModelResult!
  }

  extend type Query {
    schemaCompare(selector: SchemaCompareInput!): SchemaComparePayload!
    schemaCompareToPrevious(selector: SchemaCompareToPreviousInput!): SchemaComparePayload!
    schemaVersions(selector: SchemaVersionsInput!, after: ID, limit: Int!): SchemaVersionConnection!
    schemaVersion(selector: SchemaVersionInput!): SchemaVersion!
    """
    Requires API Token
    """
    latestVersion: SchemaVersion
    """
    Requires API Token
    """
    latestValidVersion: SchemaVersion
  }

  input DisableExternalSchemaCompositionInput {
    organization: ID!
    project: ID!
  }

  """
  @oneOf
  """
  type DisableExternalSchemaCompositionResult {
    ok: Boolean
    error: String
  }

  input EnableExternalSchemaCompositionInput {
    organization: ID!
    project: ID!
    endpoint: String!
    secret: String!
  }

  """
  @oneOf
  """
  type EnableExternalSchemaCompositionResult {
    ok: ExternalSchemaComposition
    error: EnableExternalSchemaCompositionError
  }

  type ExternalSchemaComposition {
    endpoint: String!
  }

  input UpdateProjectRegistryModelInput {
    organization: ID!
    project: ID!
    model: RegistryModel!
  }

  enum RegistryModel {
    LEGACY
    MODERN
  }

  """
  @oneOf
  """
  type UpdateProjectRegistryModelResult {
    ok: Project
    error: UpdateProjectRegistryModelError
  }

  type UpdateProjectRegistryModelError implements Error {
    message: String!
  }

  extend type Project {
    externalSchemaComposition: ExternalSchemaComposition
    registryModel: RegistryModel!
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
    latestSchemaVersion: SchemaVersion
    baseSchema: String
    hasSchema: Boolean!
  }

  type SchemaConnection {
    nodes: [Schema!]!
    total: Int!
  }

  union RegistryLog = PushedSchemaLog | DeletedSchemaLog

  type PushedSchemaLog {
    id: ID!
    author: String!
    date: DateTime!
    commit: ID!
    service: String
  }

  type DeletedSchemaLog {
    id: ID!
    date: DateTime!
    deletedService: String!
  }

  union Schema = SingleSchema | CompositeSchema

  type SingleSchema {
    id: ID!
    author: String!
    source: String!
    date: DateTime!
    commit: ID!
    metadata: String
  }

  type CompositeSchema {
    id: ID!
    author: String!
    source: String!
    date: DateTime!
    commit: ID!
    url: String
    service: String
    metadata: String
  }

  union SchemaPublishPayload =
      SchemaPublishSuccess
    | SchemaPublishError
    | SchemaPublishMissingServiceError
    | SchemaPublishMissingUrlError
    | GitHubSchemaPublishSuccess
    | GitHubSchemaPublishError

  input SchemaPublishInput {
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
    github: Boolean
  }

  union SchemaCheckPayload =
      SchemaCheckSuccess
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
    Breaking
    Dangerous
    Safe
  }

  type SchemaChange {
    criticality: CriticalityLevel!
    message: String!
    path: [String!]
  }

  type SchemaError {
    message: String!
    path: [String!]
  }

  type SchemaChangeConnection {
    nodes: [SchemaChange!]!
    total: Int!
  }

  type SchemaErrorConnection {
    nodes: [SchemaError!]!
    total: Int!
  }

  type SchemaCheckSuccess {
    valid: Boolean!
    initial: Boolean!
    changes: SchemaChangeConnection
  }

  type SchemaCheckError {
    valid: Boolean!
    changes: SchemaChangeConnection
    errors: SchemaErrorConnection!
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

  input SchemaCheckInput {
    service: ID
    sdl: String!
    github: GitHubSchemaCheckInput
  }

  input SchemaDeleteInput {
    serviceName: ID!
    dryRun: Boolean
  }

  input GitHubSchemaCheckInput {
    commit: String!
  }

  input SchemaCompareInput {
    organization: ID!
    project: ID!
    target: ID!
    after: ID!
    before: ID!
  }

  input SchemaCompareToPreviousInput {
    organization: ID!
    project: ID!
    target: ID!
    version: ID!
  }

  input SchemaVersionUpdateInput {
    organization: ID!
    project: ID!
    target: ID!
    version: ID!
    valid: Boolean!
  }

  type SchemaCompareResult {
    changes: SchemaChangeConnection!
    diff: SchemaDiff!
    initial: Boolean!
  }

  type SchemaCompareError {
    message: String!
  }

  union SchemaComparePayload = SchemaCompareResult | SchemaCompareError

  type SchemaDiff {
    after: String!
    before: String!
  }

  input SchemaVersionsInput {
    organization: ID!
    project: ID!
    target: ID!
  }

  input SchemaVersionInput {
    organization: ID!
    project: ID!
    target: ID!
    version: ID!
  }

  input UpdateBaseSchemaInput {
    organization: ID!
    project: ID!
    target: ID!
    newBase: String
  }

  type SchemaVersion {
    id: ID!
    valid: Boolean!
    date: DateTime!
    log: RegistryLog!
    baseSchema: String
    schemas: SchemaConnection!
    supergraph: String
    sdl: String
    """
    Experimental: This field is not stable and may change in the future.
    """
    explorer(usage: SchemaExplorerUsageInput): SchemaExplorer!
    errors: SchemaErrorConnection!
  }

  type SchemaVersionConnection {
    nodes: [SchemaVersion!]!
    pageInfo: PageInfo!
  }

  input SchemaExplorerUsageInput {
    period: DateRangeInput!
  }

  type SchemaExplorer {
    types: [GraphQLNamedType!]!
    type(name: String!): GraphQLNamedType
    query: GraphQLObjectType
    mutation: GraphQLObjectType
    subscription: GraphQLObjectType
  }

  type SchemaCoordinateUsage {
    total: Int!
    isUsed: Boolean!
  }

  union GraphQLNamedType =
      GraphQLObjectType
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
  }

  type GraphQLInterfaceType {
    name: String!
    description: String
    fields: [GraphQLField!]!
    interfaces: [String!]!
    usage: SchemaCoordinateUsage!
  }

  type GraphQLUnionType {
    name: String!
    description: String
    members: [GraphQLUnionTypeMember!]!
    usage: SchemaCoordinateUsage!
  }

  type GraphQLUnionTypeMember {
    name: String!
    usage: SchemaCoordinateUsage!
  }

  type GraphQLEnumType {
    name: String!
    description: String
    values: [GraphQLEnumValue!]!
    usage: SchemaCoordinateUsage!
  }

  type GraphQLInputObjectType {
    name: String!
    description: String
    fields: [GraphQLInputField!]!
    usage: SchemaCoordinateUsage!
  }

  type GraphQLScalarType {
    name: String!
    description: String
    usage: SchemaCoordinateUsage!
  }

  type GraphQLField {
    name: String!
    description: String
    type: String!
    args: [GraphQLArgument!]!
    isDeprecated: Boolean!
    deprecationReason: String
    usage: SchemaCoordinateUsage!
  }

  type GraphQLInputField {
    name: String!
    description: String
    type: String!
    defaultValue: String
    isDeprecated: Boolean!
    deprecationReason: String
    usage: SchemaCoordinateUsage!
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
  }
`;
