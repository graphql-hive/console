import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposal: NonNullable<QueryResolvers['schemaProposal']> = async (
  _parent,
  { input: { id } },
  _ctx,
) => {
  /* Implement Query.schemaProposal resolver logic here */
  return {
    createdAt: Date.now(),
    id,
    stage: 'OPEN',
    updatedAt: Date.now(),
    commentsCount: 5,
  };
};
