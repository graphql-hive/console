import type { MutationResolvers } from './../../../../__generated__/types';

export const createSchemaProposalComment: NonNullable<
  MutationResolvers['createSchemaProposalComment']
> = async (_parent, { input: { body } }, _ctx) => {
  /* Implement Mutation.createSchemaProposalComment resolver logic here */
  return {
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    body,
  };
};
