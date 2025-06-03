import { crypto } from '@whatwg-node/fetch';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createSchemaProposalReview: NonNullable<
  MutationResolvers['createSchemaProposalReview']
> = async (_parent, { input: { stageTransition } }, _ctx) => {
  /* Implement Mutation.createSchemaProposalReview resolver logic here */
  return {
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    schemaProposal: {
      stage: stageTransition ?? 'OPEN',
      createdAt: Date.now(),
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
    },
  };
};
