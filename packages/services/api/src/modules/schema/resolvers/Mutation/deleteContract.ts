import { ContractsManager } from '../../providers/contracts-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteContract: NonNullable<MutationResolvers['deleteContract']> = async (
  _,
  args,
  context,
) => {
  const result = await context.injector.get(ContractsManager).deleteContract({
    contractId: args.input.contract.byId,
  });

  if (result.type === 'success') {
    return {
      ok: {
        deletedContractId: result.contractId,
      },
    };
  }

  return {
    error: {
      message: result.message,
    },
  };
};
