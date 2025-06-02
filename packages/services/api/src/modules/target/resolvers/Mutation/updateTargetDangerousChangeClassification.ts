import { TargetManager } from '../../providers/target-manager';
import { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetDangerousChangeClassification: NonNullable<
  MutationResolvers['updateTargetDangerousChangeClassification']
> = async (_, { input }, { injector }) => {
  const target = await injector.get(TargetManager).updateTargetDangerousChangeClassification({
    target: input.target,
    failDiffOnDangerousChange: input.failDiffOnDangerousChange,
  });

  return {
    ok: {
      target,
    },
  };
};
