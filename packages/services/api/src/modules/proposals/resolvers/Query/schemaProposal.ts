import { SchemaProposalManager } from '../../providers/schema-proposal-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposal: NonNullable<QueryResolvers['schemaProposal']> = async (
  _parent,
  { input: { id } },
  { injector },
) => {
  const proposal = await injector.get(SchemaProposalManager).getProposal({ id });
  return {
    ...proposal,
    author: '', // populated in its own resolver
  };
};
