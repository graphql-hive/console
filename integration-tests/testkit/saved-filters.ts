import { graphql } from './gql';

export const GetSavedFilterQuery = graphql(`
  query GetSavedFilter($selector: TargetSelectorInput!, $id: ID!) {
    target(reference: { bySelector: $selector }) {
      id
      savedFilter(id: $id) {
        id
        type
        name
        description
        filters {
          operationIds
          clientFilters {
            name
            versions
          }
        }
        visibility
        viewsCount
        createdAt
        updatedAt
        createdBy {
          id
          displayName
        }
        viewerCanUpdate
        viewerCanDelete
      }
    }
  }
`);

export const GetSavedFiltersQuery = graphql(`
  query GetSavedFilters(
    $selector: TargetSelectorInput!
    $type: SavedFilterType!
    $first: Int!
    $after: String
    $visibility: SavedFilterVisibility
    $search: String
  ) {
    target(reference: { bySelector: $selector }) {
      id
      savedFilters(
        type: $type
        first: $first
        after: $after
        visibility: $visibility
        search: $search
      ) {
        edges {
          cursor
          node {
            id
            type
            name
            description
            visibility
            viewsCount
            createdAt
            createdBy {
              id
              displayName
            }
            viewerCanUpdate
            viewerCanDelete
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      viewerCanCreateSavedFilter
    }
  }
`);

export const CreateSavedFilterMutation = graphql(`
  mutation CreateSavedFilter($selector: TargetSelectorInput!, $input: CreateSavedFilterInput!) {
    createSavedFilter(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        savedFilter {
          id
          type
          name
          description
          filters {
            operationIds
            clientFilters {
              name
              versions
            }
          }
          visibility
          viewsCount
          createdAt
          createdBy {
            id
          }
          viewerCanUpdate
          viewerCanDelete
        }
      }
    }
  }
`);

export const UpdateSavedFilterMutation = graphql(`
  mutation UpdateSavedFilter(
    $selector: TargetSelectorInput!
    $id: ID!
    $input: UpdateSavedFilterInput!
  ) {
    updateSavedFilter(selector: $selector, id: $id, input: $input) {
      error {
        message
      }
      ok {
        savedFilter {
          id
          type
          name
          description
          filters {
            operationIds
            clientFilters {
              name
              versions
            }
          }
          visibility
          viewsCount
          updatedAt
          updatedBy {
            id
          }
          viewerCanUpdate
          viewerCanDelete
        }
      }
    }
  }
`);

export const DeleteSavedFilterMutation = graphql(`
  mutation DeleteSavedFilter($selector: TargetSelectorInput!, $id: ID!) {
    deleteSavedFilter(selector: $selector, id: $id) {
      error {
        message
      }
      ok {
        deletedId
      }
    }
  }
`);

export const TrackSavedFilterViewMutation = graphql(`
  mutation TrackSavedFilterView($selector: TargetSelectorInput!, $id: ID!) {
    trackSavedFilterView(selector: $selector, id: $id) {
      error {
        message
      }
      ok {
        savedFilter {
          id
          viewsCount
        }
      }
    }
  }
`);
