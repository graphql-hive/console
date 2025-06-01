import { ContractsManager } from '../../providers/contracts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const disableContract: NonNullable<MutationResolvers['disableContract']> = async (
  _,
  args,
  context,
) => {
  const result = await context.injector.get(ContractsManager).disableContract({
    contractId: args.input.contract.byId,
  });

  if (result.type === 'success') {
    return {
      ok: {
        disabledContract: result.contract,
      },
    };
  }

  return {
    error: {
      message: result.message,
    },
  };
};
