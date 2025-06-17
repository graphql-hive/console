import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    fieldStats(selector: FieldStatsInput!): FieldStatsValues!
    fieldListStats(selector: FieldListStatsInput!): [FieldStatsValues!]!
    hasCollectedOperations(selector: TargetSelectorInput!): Boolean!
    clientStatsByTargets(selector: ClientStatsByTargetsInput!): ClientStatsValuesConnection!
    monthlyUsage(selector: OrganizationSelectorInput!): [MonthlyUsage!]!
  }

  input OperationStatsFilterInput {
    """
    Filter by only showing operations with a specific id.
    """
    operationIds: [ID!] @tag(name: "public")
    """
    Filter by only showing operations performed by specific clients.
    """
    clientNames: [String!] @tag(name: "public")
  }

  extend type Target {
    """
    Retrieve statistics over a schema coordinates usage.
    """
    schemaCoordinateStats(
      """
      The usage period for retrieving the statistics.
      """
      period: DateRangeInput! @tag(name: "public")
      """
      The schema coordinate for which statistics should be fetched.
      """
      schemaCoordinate: String! @tag(name: "public")
    ): SchemaCoordinateStats! @tag(name: "public")
    """
    Retrieve statistics for a clients usage.
    """
    clientStats(
      """
      The usage period for retrieving the statistics.
      """
      period: DateRangeInput! @tag(name: "public")
      """
      Name of the client for which statistics should be fetched.
      """
      clientName: String! @tag(name: "public")
    ): ClientStats! @tag(name: "public")
    """
    Retrieve an overview of all operation statistics.
    """
    operationsStats(
      """
      The usage period for retrieving the statistics.
      """
      period: DateRangeInput! @tag(name: "public")
      """
      Optional filter.
      """
      filter: OperationStatsFilterInput @tag(name: "public")
    ): OperationsStats! @tag(name: "public")
  }

  input ClientStatsByTargetsInput {
    organizationSlug: String!
    projectSlug: String!
    # TODO: are these IDs or slugs?
    targetIds: [ID!]!
    period: DateRangeInput!
  }

  """
  Describes a date range interval.
  """
  input DateRangeInput {
    from: DateTime! @tag(name: "public")
    to: DateTime! @tag(name: "public")
  }

  type DateRange {
    from: DateTime! @tag(name: "public")
    to: DateTime! @tag(name: "public")
  }

  input FieldStatsInput {
    targetSlug: String!
    projectSlug: String!
    organizationSlug: String!
    type: String!
    field: String!
    argument: String
    period: DateRangeInput!
    operationHash: String
  }

  input FieldListStatsInput {
    targetSlug: String!
    projectSlug: String!
    organizationSlug: String!
    period: DateRangeInput!
    fields: [FieldTypePairInput!]!
    operationHash: String
  }

  input FieldTypePairInput {
    type: String!
    field: String!
    argument: String
  }

  type FieldStatsValues {
    type: String!
    field: String!
    argument: String
    count: SafeInt!
    percentage: Float!
  }

  type ClientStats {
    requestsOverTime(resolution: Int!): [RequestsOverTime!]!
    totalRequests: SafeInt! @tag(name: "public")
    totalVersions: SafeInt! @tag(name: "public")
    operations: OperationStatsValuesConnection! @tag(name: "public")
    versions(limit: Int!): [ClientVersionStatsValues!]!
  }

  type SchemaCoordinateStats {
    requestsOverTime(resolution: Int!): [RequestsOverTime!]!
    totalRequests: SafeInt! @tag(name: "public")
    operations: OperationStatsValuesConnection! @tag(name: "public")
    clients: ClientStatsValuesConnection! @tag(name: "public")
  }

  type OperationsStats {
    requestsOverTime(resolution: Int!): [RequestsOverTime!]!
    failuresOverTime(resolution: Int!): [FailuresOverTime!]!
    durationOverTime(resolution: Int!): [DurationOverTime!]!
    totalRequests: SafeInt! @tag(name: "public")
    totalFailures: SafeInt! @tag(name: "public")
    totalOperations: Int! @tag(name: "public")
    duration: DurationValues! @tag(name: "public")
    operations: OperationStatsValuesConnection! @tag(name: "public")
    clients: ClientStatsValuesConnection! @tag(name: "public")
  }

  type OperationStatsValuesEdge {
    node: OperationStatsValues! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type OperationStatsValuesConnection {
    edges: [OperationStatsValuesEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type ClientStatsValuesEdge {
    node: ClientStatsValues! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  type ClientStatsValuesConnection {
    edges: [ClientStatsValuesEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type MonthlyUsage {
    total: SafeInt!
    """
    Start of the month in 1992-10-21 format
    """
    date: Date!
  }

  type DurationValues {
    avg: Int! @tag(name: "public")
    p75: Int! @tag(name: "public")
    p90: Int! @tag(name: "public")
    p95: Int! @tag(name: "public")
    p99: Int! @tag(name: "public")
  }

  type OperationStatsValues {
    id: ID! @tag(name: "public")
    operationHash: String! @tag(name: "public")
    kind: String!
    name: String! @tag(name: "public")
    """
    Total number of requests
    """
    count: SafeInt! @tag(name: "public")
    """
    Number of requests that succeeded
    """
    countOk: SafeInt! @tag(name: "public")
    percentage: Float! @tag(name: "public")
    duration: DurationValues! @tag(name: "public")
  }

  type ClientStatsValues {
    name: String! @tag(name: "public")
    versions: [ClientVersionStatsValues!]!
    count: Float! @tag(name: "public")
    percentage: Float! @tag(name: "public")
  }

  type ClientVersionStatsValues {
    version: String!
    count: Float!
    percentage: Float!
  }

  type ClientNameStatsValues {
    name: String!
    count: Float!
  }

  type RequestsOverTime {
    date: DateTime!
    value: SafeInt!
  }

  type FailuresOverTime {
    date: DateTime!
    value: SafeInt!
  }

  type DurationOverTime {
    date: DateTime!
    duration: DurationValues!
  }

  extend type OrganizationGetStarted {
    reportingOperations: Boolean!
  }

  enum GraphQLOperationType {
    QUERY @tag(name: "public")
    MUTATION @tag(name: "public")
    SUBSCRIPTION @tag(name: "public")
  }

  type Operation {
    """
    Hash that uniquely identifies the operation.
    """
    hash: ID! @tag(name: "public")
    """
    Name of the operation
    """
    name: String @tag(name: "public")
    """
    Operation type
    """
    type: GraphQLOperationType! @tag(name: "public")
    """
    Operation body
    """
    body: String! @tag(name: "public")
  }

  extend type Target {
    requestsOverTime(resolution: Int!, period: DateRangeInput!): [RequestsOverTime!]!
    totalRequests(period: DateRangeInput!): SafeInt!
    """
    Retrieve an operation via it's hash.
    """
    operation(hash: ID! @tag(name: "public")): Operation @tag(name: "public")
  }

  extend type Project {
    requestsOverTime(resolution: Int!, period: DateRangeInput!): [RequestsOverTime!]!
    totalRequests(period: DateRangeInput!): SafeInt!
  }

  extend type SchemaChangeUsageStatisticsAffectedOperation {
    """
    Get the associated operation.
    The field is nullable as this data is only stored for the duration of the usage retention period.
    """
    operation: Operation @tag(name: "public")
  }
`;
