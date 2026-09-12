export type RelayConnection<TNode, TConnection extends string, TEdge extends string> = {
  __typename: TConnection;
  edges: Array<{ __typename: TEdge; cursor: string; node: TNode }>;
  pageInfo: {
    __typename: 'PageInfo';
    hasNextPage: false;
    hasPreviousPage: false;
    startCursor: string;
    endCursor: string;
  };
};

/**
 * Wraps nodes in a relay connection. hasNextPage is always false so relayPagination()
 * in the client never fetches another page of the same fixture.
 */
export function relayConnection<
  TNode extends { id: string },
  TConnection extends string,
  TEdge extends string,
>(
  connectionTypename: TConnection,
  edgeTypename: TEdge,
  nodes: TNode[],
): RelayConnection<TNode, TConnection, TEdge> {
  return {
    __typename: connectionTypename,
    edges: nodes.map(node => ({ __typename: edgeTypename, cursor: node.id, node })),
    pageInfo: {
      __typename: 'PageInfo',
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: nodes[0]?.id ?? '',
      endCursor: nodes.at(-1)?.id ?? '',
    },
  };
}
