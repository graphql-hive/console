import { gql } from 'graphql-modules';

export const typeDefs = gql`
  enum SavedFilterType {
    INSIGHTS
  }

  enum SavedFilterVisibilityType {
    PRIVATE
    SHARED
  }

  type SavedFilter {
    id: ID!
    type: SavedFilterType!
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
  }

  type ClientFilter {
    name: String!
    versions: [String!]
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
    type: SavedFilterType!
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
  }

  input ClientFilterInput {
    name: String!
    versions: [String!]
  }

  extend type Target {
    savedFilter(id: ID!): SavedFilter
    savedFilters(
      type: SavedFilterType!
      first: Int = 50
      after: String = null
      visibility: SavedFilterVisibilityType = null
      search: String = null
    ): SavedFilterConnection!
    viewerCanCreateSavedFilter: Boolean!
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
