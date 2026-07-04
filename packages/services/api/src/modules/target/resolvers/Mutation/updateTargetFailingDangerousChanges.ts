import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetFailingDangerousChanges: NonNullable<
  MutationResolvers['updateTargetFailingDangerousChanges']
> = async (_, { input }, { injector }) => {
  const target = await injector.get(TargetManager).updateTargetFailingDangerousChanges({
    target: input.target,
    all: input.all,
    failingTypes: input.failingTypes,
  });

  return {
    ok: {
      target,
    },
  };
};
