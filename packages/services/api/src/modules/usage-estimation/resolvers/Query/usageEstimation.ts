import { GraphQLError } from 'graphql';
import { UsageEstimationProvider } from '../../providers/usage-estimation.provider';
import { type QueryResolvers } from './../../../../__generated__/types';

export const usageEstimation: NonNullable<QueryResolvers['usageEstimation']> = async (
  _parent,
  args,
  { injector },
) => {
  const result = await injector.get(UsageEstimationProvider).estimateOperationsForOrganization({
    organizationSlug: args.input.organizationSlug,
    month: args.input.month,
    year: args.input.year,
  });

  if (!result && result !== 0) {
    throw new GraphQLError(`Failed to estimate usage, please try again later.`);
  }

  return {
    operations: result,
  };
};
