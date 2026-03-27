import { ContractsManager } from '../providers/contracts-manager';
import type { ContractCheckResolvers } from './../../../__generated__/types';

export const ContractCheck: ContractCheckResolvers = {
  contractVersion: (contractCheck, _, context) => {
    return context.injector.get(ContractsManager).getContractVersionForContractCheck(contractCheck);
  },
  compositeSchemaSDL: contractCheck => contractCheck.compositeSchemaSdl,
  supergraphSDL: contractCheck => contractCheck.supergraphSdl,
  hasSchemaCompositionErrors: (contractCheck, _, { injector }) => {
    return injector
      .get(ContractsManager)
      .getHasSchemaCompositionErrorsForContractCheck(contractCheck);
  },
  hasUnapprovedBreakingChanges: (contractCheck, _, { injector }) => {
    return injector
      .get(ContractsManager)
      .getHasUnapprovedBreakingChangesForContractCheck(contractCheck);
  },
  hasSchemaChanges: (contractCheck, _, { injector }) => {
    return injector.get(ContractsManager).getHasSchemaChangesForContractCheck(contractCheck);
  },
  schemaChanges: async (contractCheck, _arg, _ctx) => {
    if (contractCheck.safeSchemaChanges == null && contractCheck.breakingSchemaChanges == null) {
      return null;
    }

    return [
      ...(contractCheck.breakingSchemaChanges?.map(v => ({
        ...v,
        schemaProposalChangeDetails: null, // contracts are not supported by proposals yet
      })) ?? []),
      ...(contractCheck.safeSchemaChanges?.map(v => ({
        ...v,
        schemaProposalChangeDetails: null,
      })) ?? []),
    ];
  },
  breakingSchemaChanges: ({ breakingSchemaChanges }, _arg, _ctx) => {
    /* ContractCheck.breakingSchemaChanges resolver is required because ContractCheck.breakingSchemaChanges and ContractCheckMapper.breakingSchemaChanges are not compatible */
    return breakingSchemaChanges;
  },
  safeSchemaChanges: ({ safeSchemaChanges }, _arg, _ctx) => {
    /* ContractCheck.safeSchemaChanges resolver is required because ContractCheck.safeSchemaChanges and ContractCheckMapper.safeSchemaChanges are not compatible */
    return safeSchemaChanges;
  },
};
