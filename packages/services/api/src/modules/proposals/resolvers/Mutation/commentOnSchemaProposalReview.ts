import type { MutationResolvers } from '../../../../__generated__/types';

export const commentOnSchemaProposalReview: NonNullable<
  MutationResolvers['commentOnSchemaProposalReview']
> = async (_parent, { input: { body } }, _ctx) => {
  /* Implement Mutation.commentOnSchemaProposalReview resolver logic here */
  return {
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    body,
  };
};
