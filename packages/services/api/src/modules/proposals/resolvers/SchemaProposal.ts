import { SchemaProposalManager } from '../providers/schema-proposal-manager';
import type { SchemaProposalResolvers } from './../../../__generated__/types';

// @todo
export const SchemaProposal: SchemaProposalResolvers = {
  async rebasedSchemaSDL(proposal, args, { injector }) {
    return [];
  },
  async checks(proposal, args, { injector }) {
    return proposal.checks ?? null;
  },
  async rebasedSupergraphSDL(proposal, args, { injector }) {
    return '';
  },
  async reviews(proposal, args, { injector }) {
    injector.get(SchemaProposalManager).getPaginatedReviews({
      proposalId: proposal.id,
      after: args.after ?? '',
      first: args.first,
    });
    return proposal.reviews ?? null;
  },
};
