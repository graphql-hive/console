import { TargetManager } from '../../target/providers/target-manager';
import { ContractsManager } from '../providers/contracts-manager';
import type { ContractResolvers } from './../../../__generated__/types';

export const Contract: Pick<
  ContractResolvers,
  | 'contractName'
  | 'createdAt'
  | 'excludeTags'
  | 'id'
  | 'includeTags'
  | 'removeUnreachableTypesFromPublicApiSchema'
  | 'target'
  | 'viewerCanDeleteContract'
> = {
  target: (contract, _, context) => {
    return context.injector.get(TargetManager).getTargetById({
      targetId: contract.targetId,
    });
  },
  viewerCanDeleteContract: (contract, _, context) => {
    return context.injector.get(ContractsManager).getViewerCanDeleteContractForContract(contract);
  },
};
