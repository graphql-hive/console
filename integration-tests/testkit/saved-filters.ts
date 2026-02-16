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
          operationHashes
          clientFilters {
            name
            versions
          }
          dateRange {
            from
            to
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
    $visibility: SavedFilterVisibilityType
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
  mutation CreateSavedFilter($input: CreateSavedFilterInput!) {
    createSavedFilter(input: $input) {
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
            operationHashes
            clientFilters {
              name
              versions
            }
            dateRange {
              from
              to
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
  mutation UpdateSavedFilter($input: UpdateSavedFilterInput!) {
    updateSavedFilter(input: $input) {
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
            operationHashes
            clientFilters {
              name
              versions
            }
            dateRange {
              from
              to
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
  mutation DeleteSavedFilter($input: DeleteSavedFilterInput!) {
    deleteSavedFilter(input: $input) {
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
  mutation TrackSavedFilterView($input: TrackSavedFilterViewInput!) {
    trackSavedFilterView(input: $input) {
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
