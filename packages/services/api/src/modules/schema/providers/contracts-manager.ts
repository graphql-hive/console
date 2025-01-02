import { Injectable, Scope } from 'graphql-modules';
import type { SchemaCheck, SchemaVersion } from '@hive/storage';
import type { Target } from '../../../shared/entities';
import { cache } from '../../../shared/helpers';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import { BreakingSchemaChangeUsageHelper } from './breaking-schema-changes-helper';
import {
  Contracts,
  type Contract,
  type ContractCheck,
  type ContractVersion,
  type CreateContractInput,
} from './contracts';

@Injectable({
  scope: Scope.Operation,
})
export class ContractsManager {
  private logger: Logger;
  constructor(
    logger: Logger,
    private contracts: Contracts,
    private storage: Storage,
    private session: Session,
    private idTranslator: IdTranslator,
    private breakingSchemaChangeUsageHelper: BreakingSchemaChangeUsageHelper,
  ) {
    this.logger = logger.child({ service: 'ContractsManager' });
  }

  public async createContract(args: { contract: CreateContractInput }) {
    const breadcrumb = await this.storage.getTargetBreadcrumbForTargetId({
      targetId: args.contract.targetId,
    });
    if (!breadcrumb) {
      return {
        type: 'error' as const,
        errors: {
          targetId: 'Target not found.',
        },
      };
    }

    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(breadcrumb),
      this.idTranslator.translateProjectId(breadcrumb),
      this.idTranslator.translateTargetId(breadcrumb),
    ]);

    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    return await this.contracts.createContract(args);
  }

  public async disableContract(args: { contractId: string }) {
    const contract = await this.contracts.getContractById({ contractId: args.contractId });
    if (contract === null) {
      return {
        type: 'error' as const,
        message: 'Contract not found.',
      };
    }

    const breadcrumb = await this.storage.getTargetBreadcrumbForTargetId({
      targetId: contract.targetId,
    });
    if (!breadcrumb) {
      return {
        type: 'error' as const,
        message: 'Contract not found.',
      };
    }

    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(breadcrumb),
      this.idTranslator.translateProjectId(breadcrumb),
      this.idTranslator.translateTargetId(breadcrumb),
    ]);

    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    return await this.contracts.disableContract({
      contract,
    });
  }

  async getViewerCanDisableContractForContract(contract: Contract): Promise<boolean> {
    if (contract.isDisabled) {
      return false;
    }

    const breadcrumb = await this.storage.getTargetBreadcrumbForTargetId({
      targetId: contract.targetId,
    });

    if (!breadcrumb) {
      return false;
    }

    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(breadcrumb),
      this.idTranslator.translateProjectId(breadcrumb),
      this.idTranslator.translateTargetId(breadcrumb),
    ]);

    return await this.session.canPerformAction({
      action: 'target:modifySettings',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });
  }

  public async getPaginatedContractsForTarget(args: {
    target: Target;
    cursor: string | null;
    first: number | null;
  }) {
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: args.target.orgId,
      params: {
        organizationId: args.target.orgId,
        projectId: args.target.projectId,
        targetId: args.target.id,
      },
    });

    return this.contracts.getPaginatedContractsByTargetId({
      targetId: args.target.id,
      cursor: args.cursor,
      first: args.first,
      onlyActive: false,
    });
  }

  public async getPaginatedActiveContractsForTarget(args: {
    target: Target;
    cursor: string | null;
    first: number | null;
  }) {
    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId: args.target.orgId,
      params: {
        organizationId: args.target.orgId,
        projectId: args.target.projectId,
      },
    });

    return this.contracts.getPaginatedContractsByTargetId({
      targetId: args.target.id,
      cursor: args.cursor,
      first: args.first,
      onlyActive: false,
    });
  }

  @cache<string>(contractVersionId => contractVersionId)
  private async getContractVersionById(contractVersionId: string) {
    if (contractVersionId === null) {
      return null;
    }

    return await this.contracts.getContractVersionById({ contractVersionId });
  }

  public async getContractVersionForContractCheck(contractCheck: ContractCheck) {
    if (contractCheck.comparedContractVersionId === null) {
      return null;
    }
    return await this.getContractVersionById(contractCheck.comparedContractVersionId);
  }

  @cache<ContractVersion>(contractVersion => contractVersion.id)
  public async getPreviousContractVersionForContractVersion(contractVersion: ContractVersion) {
    return await this.contracts.getPreviousContractVersionForContractVersion({
      contractVersion,
    });
  }

  @cache<ContractVersion>(contractVersion => contractVersion.id)
  public async getDiffableContractVersionForContractVersion(contractVersion: ContractVersion) {
    return await this.contracts.getDiffableContractVersionForContractVersion({
      contractVersion,
    });
  }

  public async getIsFirstComposableVersionForContractVersion(contractVersion: ContractVersion) {
    const diffableContractVersion =
      await this.getDiffableContractVersionForContractVersion(contractVersion);
    return !diffableContractVersion;
  }

  public async getBreakingChangesForContractVersion(contractVersion: ContractVersion) {
    return await this.contracts.getBreakingChangesForContractVersion({
      contractVersionId: contractVersion.id,
    });
  }

  public async getSafeChangesForContractVersion(contractVersion: ContractVersion) {
    return await this.contracts.getSafeChangesForContractVersion({
      contractVersionId: contractVersion.id,
    });
  }

  public async getContractVersionsForSchemaVersion(schemaVersion: SchemaVersion) {
    return await this.contracts.getContractVersionsForSchemaVersion({
      schemaVersionId: schemaVersion.id,
    });
  }

  public async getContractsChecksForSchemaCheck(schemaCheck: SchemaCheck) {
    const contractChecks = await this.contracts.getPaginatedContractChecksBySchemaCheckId({
      schemaCheckId: schemaCheck.id,
    });

    if (contractChecks?.edges && schemaCheck.conditionalBreakingChangeMetadata) {
      for (const edge of contractChecks.edges) {
        if (edge.node.breakingSchemaChanges) {
          for (const breakingSchemaChange of edge.node.breakingSchemaChanges) {
            this.breakingSchemaChangeUsageHelper.registerUsageDataForBreakingSchemaChange(
              breakingSchemaChange,
              schemaCheck.conditionalBreakingChangeMetadata.usage,
            );
          }
        }
      }
    }

    return contractChecks;
  }

  public async getIsFirstComposableContractVersionForContractVersion(
    contractVersion: ContractVersion,
  ) {
    const previousContractVersion =
      await this.getDiffableContractVersionForContractVersion(contractVersion);

    return !!previousContractVersion;
  }

  public async getHasSchemaChangesForContractVersion(contractVersion: ContractVersion) {
    const [safeChanges, breakingChanges] = await Promise.all([
      this.getSafeChangesForContractVersion(contractVersion),
      this.getBreakingChangesForContractVersion(contractVersion),
    ]);

    return !!(safeChanges?.length || breakingChanges?.length);
  }

  public async getHasSchemaCompositionErrorsForContractCheck(contractCheck: ContractCheck) {
    return contractCheck.schemaCompositionErrors !== null;
  }

  public async getHasUnapprovedBreakingChangesForContractCheck(contractCheck: ContractCheck) {
    return (
      contractCheck.breakingSchemaChanges?.some(
        change => change.approvalMetadata === null && !change.isSafeBasedOnUsage,
      ) ?? false
    );
  }

  public async getHasSchemaChangesForContractCheck(contractCheck: ContractCheck) {
    return !!(
      contractCheck.breakingSchemaChanges?.length || contractCheck.safeSchemaChanges?.length
    );
  }
}
