import { SchemaProposalManager } from '../../providers/schema-proposal-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposal: NonNullable<QueryResolvers['schemaProposal']> = async (
  _parent,
  { input: { id } },
  { injector },
) => {
  return injector.get(SchemaProposalManager).getProposal({ id });
};
