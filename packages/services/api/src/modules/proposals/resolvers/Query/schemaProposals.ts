import { SchemaProposalManager } from '../../providers/schema-proposal-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

// @todo how to make this stop complaining?... Fix author return logic
export const schemaProposals: NonNullable<QueryResolvers['schemaProposals']> = async (
  _,
  args,
  { injector },
) => {
  return injector.get(SchemaProposalManager).getPaginatedProposals({
    target: args.input.target,
    first: args.first,
    after: args.after ?? '',
    stages: (args.input?.stages as any[]) ?? [],
    users: args.input.userIds ?? [],
  });
};
