import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetGraphQLEndpointUrl: NonNullable<
  MutationResolvers['updateTargetGraphQLEndpointUrl']
> = async (_, { input }, { injector }) => {
  const result = await injector.get(TargetManager).updateTargetGraphQLEndpointUrl({
    target: input.target,
    graphqlEndpointUrl: input.graphqlEndpointUrl ?? null,
  });

  if (result.type === 'error') {
    return {
      error: {
        message: result.reason,
      },
    };
  }

  return {
    ok: {
      target: result.target,
    },
  };
};
