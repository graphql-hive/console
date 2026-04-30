import { ContractsManager } from '../providers/contracts-manager';
import { SchemaCheckManager } from '../providers/schema-check-manager';
import { SchemaManager } from '../providers/schema-manager';
import type { FailedSchemaCheckResolvers } from './../../../__generated__/types';

export const FailedSchemaCheck: FailedSchemaCheckResolvers = {
  schemaVersion: (schemaCheck, _, { injector }) => {
    return injector.get(SchemaCheckManager).getSchemaVersion(schemaCheck);
  },
  safeSchemaChanges: (schemaCheck, _, { injector }) => {
    const selector = {
      organizationId: schemaCheck.selector.organizationId,
      projectId: schemaCheck.selector.projectId,
      targetId: schemaCheck.targetId,
      schemaProposalId: schemaCheck.schemaProposalId,
      schemaVersionId: null,
    };
    return injector
      .get(SchemaCheckManager)
      .getSafeSchemaChanges(schemaCheck)
      ?.map(c => ({
        ...c,
        selector,
      }));
  },
  breakingSchemaChanges: (schemaCheck, _, { injector }) => {
    const selector = {
      organizationId: schemaCheck.selector.organizationId,
      projectId: schemaCheck.selector.projectId,
      targetId: schemaCheck.targetId,
      schemaProposalId: schemaCheck.schemaProposalId,
      schemaVersionId: null,
    };
    return injector
      .get(SchemaCheckManager)
      .getBreakingSchemaChanges(schemaCheck)
      ?.map(c => ({
        ...c,
        selector,
      }));
  },
  compositionErrors: schemaCheck => {
    return schemaCheck.schemaCompositionErrors;
  },
  hasSchemaCompositionErrors: (schemaCheck, _, { injector }) => {
    return injector.get(SchemaCheckManager).getHasSchemaCompositionErrors(schemaCheck);
  },
  hasSchemaChanges: (schemaCheck, _, { injector }) => {
    return injector.get(SchemaCheckManager).getHasSchemaChanges(schemaCheck);
  },
  hasUnapprovedBreakingChanges: (schemaCheck, _, { injector }) => {
    return injector.get(SchemaCheckManager).getHasUnapprovedBreakingChanges(schemaCheck);
  },
  webUrl: (schemaCheck, _, { injector }) => {
    return injector.get(SchemaManager).getSchemaCheckWebUrl({
      schemaCheckId: schemaCheck.id,
      targetId: schemaCheck.targetId,
    });
  },
  canBeApproved: async (schemaCheck, _, { injector }) => {
    return injector.get(SchemaManager).getFailedSchemaCheckCanBeApproved(schemaCheck);
  },
  canBeApprovedByViewer: async (schemaCheck, _, { injector }) => {
    return injector.get(SchemaManager).getFailedSchemaCheckCanBeApprovedByViewer(schemaCheck);
  },
  contractChecks: (schemaCheck, _, { injector }) => {
    return injector.get(ContractsManager).getContractsChecksForSchemaCheck(schemaCheck);
  },
  previousSchemaSDL: (schemaCheck, _, { injector }) => {
    return injector.get(SchemaCheckManager).getPreviousSchemaSDL(schemaCheck);
  },
  conditionalBreakingChangeMetadata: (schemaCheck, _, { injector }) => {
    return injector.get(SchemaCheckManager).getConditionalBreakingChangeMetadata(schemaCheck);
  },
  schemaChanges: (schemaCheck, _, { injector }) => {
    const selector = {
      organizationId: schemaCheck.selector.organizationId,
      projectId: schemaCheck.selector.projectId,
      targetId: schemaCheck.targetId,
      schemaProposalId: schemaCheck.schemaProposalId,
      schemaVersionId: null,
    };
    return injector
      .get(SchemaCheckManager)
      .getAllSchemaChanges(schemaCheck)
      ?.map(c => ({
        ...c,
        selector,
      }));
  },
};
