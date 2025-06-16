import type { MutationResolvers } from './../../../../__generated__/types';

export const createSchemaProposalReview: NonNullable<
  MutationResolvers['createSchemaProposalReview']
> = async (_parent, { input: { stageTransition, commentBody } }, _ctx) => {
  /* Implement Mutation.createSchemaProposalReview resolver logic here */
  return {
    createdAt: Date.now(),
    id: `abcd-1234-efgh-5678-wxyz`,
    schemaProposal: {
      stage: stageTransition ?? 'OPEN',
      commentsCount: commentBody ? 1 : 0,
      createdAt: Date.now(),
      id: `abcd-1234-efgh-5678-wxyz`,
      updatedAt: Date.now(),
    },
  };
};
