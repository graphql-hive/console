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

/** One trace in the list, no filter options and no traffic buckets. */
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
      tracesFilterOptions: {
        __typename: 'TracesFilterOptions' as const,
        success: [],
        errorCode: [],
        operationType: [],
        operationName: [],
        clientName: [],
        httpStatusCode: [],
        httpMethod: [],
        httpHost: [],
        httpRoute: [],
        httpUrl: [],
        subgraphs: [],
      },
      tracesStatusBreakdown: [],
    },
  };
}

export function tracesFixtures() {
  return new Map<string, unknown>([['TargetTracesPageQuery', tracesPage()]]);
}
