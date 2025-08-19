import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposalReviews: NonNullable<QueryResolvers['schemaProposalReviews']> = async (
  _parent,
  _arg,
  _ctx,
) => {
  /* Implement Query.schemaProposalReviews resolver logic here */
  return {
    edges: [
      {
        cursor: '1234',
        node: {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          lineNumber: 3,
          schemaCoordinate: 'User',
          lineText: 'type User {',
          comments: {
            pageInfo: {
              endCursor: '',
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: '',
            },
            edges: [
              {
                cursor: crypto.randomUUID(),
                node: {
                  createdAt: Date.now(),
                  id: crypto.randomUUID(),
                  body: 'This is a comment. The first comment.',
                  updatedAt: Date.now(),
                },
              },
            ],
          },
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
