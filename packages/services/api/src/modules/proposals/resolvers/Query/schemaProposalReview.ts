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
      stage: 'OPEN',
      updatedAt: Date.now(),
    },
  };
};
