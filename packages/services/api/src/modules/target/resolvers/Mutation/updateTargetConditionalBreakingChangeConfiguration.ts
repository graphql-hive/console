import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetConditionalBreakingChangeConfiguration: NonNullable<
  MutationResolvers['updateTargetConditionalBreakingChangeConfiguration']
> = async (_parent, { input }, { injector }) => {
  const result = await injector
    .get(TargetManager)
    .updateTargetConditionalBreakingChangeConfiguration({
      target: input.target,
      configuration: input.configuration,
    });

  if (result.ok) {
    return {
      ok: {
        target: result.target,
      },
    };
  }

  return {
    error: {
      message: result.error.message,
      inputErrors: result.error.inputErrors,
    },
  };
};
