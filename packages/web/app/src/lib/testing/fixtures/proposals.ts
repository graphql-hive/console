export const PROPOSAL = { id: 'proposal-1', title: 'Add Query.me' } as const;

/** `listProposals`: one open proposal, the whole list. */
export function proposalsList() {
  return {
    __typename: 'Query' as const,
    schemaProposals: {
      __typename: 'SchemaProposalConnection' as const,
      edges: [
        {
          __typename: 'SchemaProposalEdge' as const,
          cursor: 'cursor-1',
          node: {
            __typename: 'SchemaProposal' as const,
            id: PROPOSAL.id,
            title: PROPOSAL.title,
            stage: 'OPEN',
            updatedAt: '2026-09-27T10:00:00.000Z',
            author: 'User',
          },
        },
      ],
      pageInfo: { __typename: 'PageInfo' as const, endCursor: 'cursor-1', hasNextPage: true },
    },
  };
}

export function proposalsFixtures() {
  return new Map<string, unknown>([['listProposals', proposalsList()]]);
}
