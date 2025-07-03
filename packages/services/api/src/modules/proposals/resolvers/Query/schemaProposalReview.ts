import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposalReview: NonNullable<QueryResolvers['schemaProposalReview']> = async (
  _parent,
  { input: { id } },
  _ctx,
) => {
  /* Implement Query.schemaProposalReview resolver logic here */
  return {
    createdAt: Date.now(),
    id,
    schemaProposal: {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      commentsCount: 3,
      stage: 'OPEN',
      updatedAt: Date.now(),
      comments: {
        edges: [
          {
            cursor: crypto.randomUUID(),
            node: {
              id: crypto.randomUUID(),
              body: 'This is a comment. The first comment.',
              updatedAt: Date.now(),
            },
          },
        ],
      },
    },
  };
};
