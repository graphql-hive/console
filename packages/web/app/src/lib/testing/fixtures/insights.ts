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

/** Every document the insights page and the operation page read, for a target without traffic. */
export function insightsFixtures() {
  return new Map<string, unknown>([
    ['TargetOperationsPageQuery', insightsGate()],
    ['InsightsFilterPicker', insightsFilterPicker()],
    ['Stats_GeneralOperationsStats', generalOperationsStats()],
    ['OperationsList_OperationsStats', operationsList()],
    ['OperationInsightsPageQuery', operationInsightsPage()],
    ['GraphQLOperationBody_GetOperationBodyQuery', operationBody()],
  ]);
}
