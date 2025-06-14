import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposals: NonNullable<QueryResolvers['schemaProposals']> = async (
  _parent,
  _arg,
  _ctx,
) => {
  /* Implement Query.schemaProposals resolver logic here */
  return {
    edges: [
      {
        cursor: crypto.randomUUID(),
        node: {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          stage: 'DRAFT',
          updatedAt: Date.now(),
        },
      },
    ],
    pageInfo: {
      endCursor: '',
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: '',
    },
  };
};
