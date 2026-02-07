import { gql } from 'graphql-modules';

export const typeDefs = gql`
  enum SavedFilterType {
    INSIGHTS
  }

  enum SavedFilterVisibility {
    PRIVATE
    SHARED
  }

  type SavedFilter {
    id: ID!
    type: SavedFilterType!
    name: String!
    description: String
    filters: InsightsFilterConfiguration!
    visibility: SavedFilterVisibility!
    viewsCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: User
    updatedBy: User
    viewerCanUpdate: Boolean!
    viewerCanDelete: Boolean!
  }

  type InsightsFilterConfiguration {
    operationIds: [ID!]!
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
    type: SavedFilterType!
    name: String!
    description: String
    visibility: SavedFilterVisibility!
    insightsFilter: InsightsFilterConfigurationInput
  }

  input UpdateSavedFilterInput {
    name: String
    description: String
    visibility: SavedFilterVisibility
    insightsFilter: InsightsFilterConfigurationInput
  }

  input InsightsFilterConfigurationInput {
    operationIds: [ID!]
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
      visibility: SavedFilterVisibility = null
      search: String = null
    ): SavedFilterConnection!
    viewerCanCreateSavedFilter: Boolean!
  }

  extend type Mutation {
    createSavedFilter(
      selector: TargetSelectorInput!
      input: CreateSavedFilterInput!
    ): CreateSavedFilterResult!
    updateSavedFilter(
      selector: TargetSelectorInput!
      id: ID!
      input: UpdateSavedFilterInput!
    ): UpdateSavedFilterResult!
    deleteSavedFilter(selector: TargetSelectorInput!, id: ID!): DeleteSavedFilterResult!
    trackSavedFilterView(selector: TargetSelectorInput!, id: ID!): TrackSavedFilterViewResult!
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
