import { gql } from 'graphql-modules';

export const typeDefs = gql`
  enum SavedFilterVisibilityType {
    PRIVATE
    SHARED
  }

  type SavedFilter {
    id: ID!
    name: String!
    description: String
    filters: InsightsFilterConfiguration!
    visibility: SavedFilterVisibilityType!
    viewsCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: User
    updatedBy: User
    viewerCanUpdate: Boolean!
    viewerCanDelete: Boolean!
  }

  type InsightsFilterConfiguration {
    operationHashes: [String!]!
    clientFilters: [ClientFilter!]!
    dateRange: InsightsDateRange
    excludeOperations: Boolean
    excludeClientFilters: Boolean
    """
    Schema coordinates (e.g. "Query.me"). Scopes to operations whose document uses any of them.
    """
    schemaCoordinates: [String!]!
    """
    Federation subgraph names. Each resolves to the object fields the subgraph owns in the
    latest valid schema version, so the filter follows the schema as it changes.
    """
    subgraphNames: [String!]!
  }

  type ClientFilter {
    name: String!
    versions: [String!]
  }

  type InsightsDateRange {
    from: String!
    to: String!
  }

  type SavedFilterEdge {
    node: SavedFilter!
    cursor: String!
  }

  type SavedFilterConnection {
    edges: [SavedFilterEdge!]!
    pageInfo: PageInfo!
  }

  input CreateSavedFilterInput {
    target: TargetReferenceInput!
    name: String!
    description: String
    visibility: SavedFilterVisibilityType!
    insightsFilter: InsightsFilterConfigurationInput
  }

  input UpdateSavedFilterInput {
    target: TargetReferenceInput!
    id: ID!
    name: String
    description: String
    visibility: SavedFilterVisibilityType
    insightsFilter: InsightsFilterConfigurationInput
  }

  input DeleteSavedFilterInput {
    target: TargetReferenceInput!
    id: ID!
  }

  input TrackSavedFilterViewInput {
    target: TargetReferenceInput!
    id: ID!
  }

  input InsightsFilterConfigurationInput {
    operationHashes: [String!]
    clientFilters: [ClientFilterInput!]
    dateRange: InsightsDateRangeInput
    excludeOperations: Boolean
    excludeClientFilters: Boolean
    schemaCoordinates: [String!]
    """
    Only on Federation projects. Every name must exist in the latest valid schema version.
    """
    subgraphNames: [String!]
  }

  input InsightsDateRangeInput {
    from: String!
    to: String!
  }

  input ClientFilterInput {
    name: String!
    versions: [String!]
  }

  extend type Target {
    savedFilter(id: ID!): SavedFilter
    savedFilters(
      first: Int = 50
      after: String
      visibility: SavedFilterVisibilityType
      search: String
    ): SavedFilterConnection!
    viewerCanCreateSavedFilter: Boolean!
    viewerCanShareSavedFilter: Boolean!
  }

  extend type Mutation {
    createSavedFilter(input: CreateSavedFilterInput!): CreateSavedFilterResult!
    updateSavedFilter(input: UpdateSavedFilterInput!): UpdateSavedFilterResult!
    deleteSavedFilter(input: DeleteSavedFilterInput!): DeleteSavedFilterResult!
    trackSavedFilterView(input: TrackSavedFilterViewInput!): TrackSavedFilterViewResult!
  }

  type SavedFilterError implements Error {
    message: String!
  }

  """
  @oneOf
  """
  type CreateSavedFilterResult {
    ok: CreateSavedFilterOkPayload
    error: SavedFilterError
  }

  type CreateSavedFilterOkPayload {
    savedFilter: SavedFilter!
  }

  """
  @oneOf
  """
  type UpdateSavedFilterResult {
    ok: UpdateSavedFilterOkPayload
    error: SavedFilterError
  }

  type UpdateSavedFilterOkPayload {
    savedFilter: SavedFilter!
  }

  """
  @oneOf
  """
  type DeleteSavedFilterResult {
    ok: DeleteSavedFilterOkPayload
    error: SavedFilterError
  }

  type DeleteSavedFilterOkPayload {
    deletedId: ID!
  }

  """
  @oneOf
  """
  type TrackSavedFilterViewResult {
    ok: TrackSavedFilterViewOkPayload
    error: SavedFilterError
  }

  type TrackSavedFilterViewOkPayload {
    savedFilter: SavedFilter!
  }
`;
