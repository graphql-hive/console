export const TRACE = {
  __typename: 'Trace' as const,
  id: 'trace-1',
  timestamp: '2026-09-28T10:00:00.000Z',
  operationName: 'GetUser',
  operationType: 'QUERY',
  operationHash: 'hash-1',
  duration: 12_000_000,
  subgraphs: ['users'],
  success: true,
  clientName: 'web',
  clientVersion: '1.0.0',
  httpStatusCode: '200',
  httpMethod: 'POST',
  httpHost: 'api.example.com',
  httpRoute: '/graphql',
  httpUrl: 'https://api.example.com/graphql',
};

// One trace in the list and no traffic buckets.
export function tracesPage() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: 'target-1',
      traces: {
        __typename: 'TraceConnection' as const,
        edges: [{ __typename: 'TraceEdge' as const, cursor: 'cursor-1', node: TRACE }],
        pageInfo: { __typename: 'PageInfo' as const, hasNextPage: false, endCursor: 'cursor-1' },
      },
      tracesStatusBreakdown: [],
    },
  };
}

const valueList = (values: string[] = [], truncated = false) => ({
  __typename: 'TracesFilterValueList' as const,
  values,
  truncated,
});

/** The period's filter values; every list empty unless overridden. */
export function tracesFilterValues(
  lists: Partial<Record<string, ReturnType<typeof valueList>>> = {},
) {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: 'target-1',
      tracesFilterValues: {
        __typename: 'TracesFilterValues' as const,
        operationNames: valueList(),
        clientNames: valueList(),
        subgraphNames: valueList(),
        errorCodes: valueList(),
        httpStatusCodes: valueList(),
        httpMethods: valueList(),
        httpHosts: valueList(),
        httpRoutes: valueList(),
        httpUrls: valueList(),
        ...lists,
      },
    },
  };
}

export { valueList as tracesFilterValueList };

export function tracesFixtures() {
  return new Map<string, unknown>([
    ['TargetTracesPageQuery', tracesPage()],
    ['TargetTracesFilterValuesQuery', tracesFilterValues()],
  ]);
}
