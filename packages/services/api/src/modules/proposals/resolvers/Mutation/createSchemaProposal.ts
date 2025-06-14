import type { MutationResolvers } from './../../../../__generated__/types';

export const createSchemaProposal: NonNullable<MutationResolvers['createSchemaProposal']> = async (
  _parent,
  _arg,
  _ctx,
) => {
  /* Implement Mutation.createSchemaProposal resolver logic here */
  return {
    createdAt: Date.now(),
    id: `abcd-1234-efgh-5678-wxyz`,
    stage: 'DRAFT',
    updatedAt: Date.now(),
  };
};
