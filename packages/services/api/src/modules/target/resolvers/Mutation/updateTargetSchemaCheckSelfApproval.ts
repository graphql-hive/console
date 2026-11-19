import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetSchemaCheckSelfApproval: NonNullable<
  MutationResolvers['updateTargetSchemaCheckSelfApproval']
> = async (_, { input }, { injector }) => {
  const result = await injector.get(TargetManager).updateTargetSchemaCheckSelfApproval({
    target: input.target,
    allowSchemaCheckSelfApproval: input.allowSchemaCheckSelfApproval,
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
