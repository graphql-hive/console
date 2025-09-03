import { SchemaProposalManager } from '../../providers/schema-proposal-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const reviewSchemaProposal: NonNullable<MutationResolvers['reviewSchemaProposal']> = async (
  _,
  args,
  { injector },
) => {
  const result = await injector.get(SchemaProposalManager).reviewProposal({
    proposalId: args.input.schemaProposalId,
    stage: args.input.stageTransition ?? null,
    body: args.input.commentBody ?? null,
    serviceName: args.input.serviceName,
    // @todo coordinate etc
  });
  if (result.type === 'error') {
    return {
      error: {
        message: result.error.message,
        details: result.error.details,
      },
      ok: null,
    };
  }
  return {
    ok: {
      review: result.review,
    },
  };
};
