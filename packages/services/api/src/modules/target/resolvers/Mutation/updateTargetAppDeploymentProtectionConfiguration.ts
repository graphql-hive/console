import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetAppDeploymentProtectionConfiguration: NonNullable<
  MutationResolvers['updateTargetAppDeploymentProtectionConfiguration']
> = async (_parent, { input }, { injector }) => {
  const result = await injector
    .get(TargetManager)
    .updateTargetAppDeploymentProtectionConfiguration({
      target: input.target,
      configuration: input.appDeploymentProtectionConfiguration,
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
