import type { SubscriptionResolvers } from '../../../../__generated__/types';
import { SchemaProposalManager } from '../../providers/schema-proposal-manager';

export const schemaProposalComposition: NonNullable<
  SubscriptionResolvers['schemaProposalComposition']
> = {
  subscribe: (_, args, { injector }) =>
    injector
      .get(SchemaProposalManager)
      .subscribeToSchemaProposalCompositions({ proposalId: args.input.proposalId }),
  resolve: (payload: { status: string; timestamp: string; reason?: string | null }) => payload,
};
