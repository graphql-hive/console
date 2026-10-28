import { SLUGS } from './layouts';

const TARGET_ID = 'target-1';

export const OPERATION = { name: 'GetUser', hash: 'op-1' } as const;

/** Stats for a period without traffic: one operation with no requests, every series empty. */
function operationsStats() {
  return {
    __typename: 'OperationsStats' as const,
    totalRequests: 0,
    totalFailures: 0,
    totalOperations: 0,
    duration: { __typename: 'DurationValues' as const, p75: 0, p90: 0, p95: 0, p99: 0 },
    failuresOverTime: [],
    requestsOverTime: [],
    durationOverTime: [],
    clients: { __typename: 'ClientStatsValuesConnection' as const, edges: [] },
    operations: {
      __typename: 'OperationStatsValuesConnection' as const,
      edges: [
        {
          __typename: 'OperationStatsValuesEdge' as const,
          node: {
            __typename: 'OperationStatsValues' as const,
            id: OPERATION.hash,
            name: OPERATION.name,
            operationHash: OPERATION.hash,
            kind: 'query',
            countOk: 0,
            count: 0,
            percentage: 0,
            duration: { __typename: 'DurationValues' as const, p90: 0, p95: 0, p99: 0, avg: 0 },
          },
        },
      ],
    },
  };
}

export function insightsGate() {
  return { __typename: 'Query' as const, hasCollectedOperations: true };
}

export function insightsFilterPicker() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      viewerCanCreateSavedFilter: true,
      viewerCanShareSavedFilter: true,
      operationsStats: operationsStats(),
      savedFilters: { __typename: 'SavedFilterConnection' as const, edges: [] },
    },
  };
}

export const SUBGRAPHS = ['users', 'reviews'] as const;
export const FIELD_COORDINATES = ['Query.me', 'User.id', 'User.name'] as const;

/** A federation target whose latest version has two subgraphs and three object fields. */
export function insightsSchemaFilterOptions(projectType: 'FEDERATION' | 'SINGLE' = 'FEDERATION') {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      project: { __typename: 'Project' as const, id: 'project-1', type: projectType },
      latestValidSchemaVersion: {
        __typename: 'SchemaVersion' as const,
        id: 'version-1',
        explorer: {
          __typename: 'SchemaExplorer' as const,
          subgraphNames: [...SUBGRAPHS],
          types: [
            {
              __typename: 'GraphQLObjectType' as const,
              name: 'Query',
              fields: [{ __typename: 'GraphQLField' as const, name: 'me' }],
            },
            {
              __typename: 'GraphQLObjectType' as const,
              name: 'User',
              fields: [
                { __typename: 'GraphQLField' as const, name: 'id' },
                { __typename: 'GraphQLField' as const, name: 'name' },
              ],
            },
            { __typename: 'GraphQLEnumType' as const },
          ],
        },
      },
    },
  };
}

export function generalOperationsStats() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      allOperations: { __typename: 'OperationsStats' as const, totalRequests: 0 },
      operationsStats: operationsStats(),
    },
  };
}

export function operationsList() {
  return {
    __typename: 'Query' as const,
    target: { __typename: 'Target' as const, id: TARGET_ID, operationsStats: operationsStats() },
  };
}

export function operationInsightsPage() {
  return {
    __typename: 'Query' as const,
    hasCollectedOperations: true,
    organization: {
      __typename: 'Organization' as const,
      id: 'organization-1',
      slug: SLUGS.organizationSlug,
      usageRetentionInDays: 30,
    },
  };
}

export function operationBody() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      operation: {
        __typename: 'Operation' as const,
        type: 'QUERY',
        body: `query ${OPERATION.name} { me { id } }`,
      },
    },
  };
}

export const SAVED_FILTER = {
  id: 'filter-1',
  name: 'Reviews subgraph',
  schemaCoordinates: ['Query.me', 'Query.gone'],
  subgraphNames: ['reviews'],
} as const;

/** One shared saved filter that uses the Fields and Subgraphs dimensions. */
export function manageFiltersSavedFilters() {
  return {
    __typename: 'Query' as const,
    organization: {
      __typename: 'Organization' as const,
      id: 'organization-1',
      usageRetentionInDays: 30,
    },
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      viewerCanCreateSavedFilter: true,
      viewerCanShareSavedFilter: true,
      savedFilters: {
        __typename: 'SavedFilterConnection' as const,
        edges: [
          {
            __typename: 'SavedFilterEdge' as const,
            cursor: 'cursor-1',
            node: {
              __typename: 'SavedFilter' as const,
              id: SAVED_FILTER.id,
              name: SAVED_FILTER.name,
              description: null,
              visibility: 'SHARED',
              viewsCount: 3,
              createdAt: '2026-10-01T00:00:00.000Z',
              updatedAt: '2026-10-01T00:00:00.000Z',
              filters: {
                __typename: 'InsightsFilterConfiguration' as const,
                operationHashes: [],
                clientFilters: [],
                dateRange: null,
                excludeOperations: false,
                excludeClientFilters: false,
                schemaCoordinates: [...SAVED_FILTER.schemaCoordinates],
                subgraphNames: [...SAVED_FILTER.subgraphNames],
              },
              createdBy: { __typename: 'User' as const, id: 'user-1', displayName: 'User' },
              viewerCanUpdate: true,
              viewerCanDelete: true,
              usedByAlertRulesCount: 0,
            },
          },
        ],
        pageInfo: { __typename: 'PageInfo' as const, hasNextPage: false, endCursor: 'cursor-1' },
      },
    },
  };
}

export function manageFiltersOperationStats() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      operationsStats: {
        __typename: 'OperationsStats' as const,
        operations: { __typename: 'OperationStatsValuesConnection' as const, edges: [] },
        clients: { __typename: 'ClientStatsValuesConnection' as const, edges: [] },
      },
    },
  };
}

/** The manage-filters page with one saved filter, plus the schema options its row editor reads. */
export function manageFiltersFixtures() {
  return new Map<string, unknown>([
    ['ManageFilters_SavedFiltersQuery', manageFiltersSavedFilters()],
    ['ManageFilters_OperationStats', manageFiltersOperationStats()],
    ['InsightsSchemaFilterOptions', insightsSchemaFilterOptions()],
  ]);
}

/** Every document the insights page and the operation page read, for a target without traffic. */
export function insightsFixtures() {
  return new Map<string, unknown>([
    ['TargetOperationsPageQuery', insightsGate()],
    ['InsightsFilterPicker', insightsFilterPicker()],
    ['InsightsSchemaFilterOptions', insightsSchemaFilterOptions()],
    ['Stats_GeneralOperationsStats', generalOperationsStats()],
    ['OperationsList_OperationsStats', operationsList()],
    ['OperationInsightsPageQuery', operationInsightsPage()],
    ['GraphQLOperationBody_GetOperationBodyQuery', operationBody()],
  ]);
}
