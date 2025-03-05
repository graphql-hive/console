import { createHash } from 'node:crypto';
import stringify from 'fast-json-stable-stringify';
import { parse, print } from 'graphql';
import { Inject, Injectable, Scope } from 'graphql-modules';
import lodash from 'lodash';
import promClient from 'prom-client';
import { z } from 'zod';
import { CriticalityLevel } from '@graphql-inspector/core';
import { trace, traceFn } from '@hive/service-common';
import type {
  ConditionalBreakingChangeMetadata,
  SchemaChangeType,
  SchemaCheck,
} from '@hive/storage';
import * as Sentry from '@sentry/node';
import * as Types from '../../../__generated__/types';
import { Organization, Project, ProjectType, Schema, Target } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { createPeriod } from '../../../shared/helpers';
import { isGitHubRepositoryString } from '../../../shared/is-github-repository-string';
import { bolderize } from '../../../shared/markdown';
import { AlertsManager } from '../../alerts/providers/alerts-manager';
import { InsufficientPermissionError, Session } from '../../auth/lib/authz';
import { RateLimitProvider } from '../../commerce/providers/rate-limit.provider';
import {
  GitHubIntegrationManager,
  type GitHubCheckRun,
} from '../../integrations/providers/github-integration-manager';
import { OperationsReader } from '../../operations/providers/operations-reader';
import { DistributedCache } from '../../shared/providers/distributed-cache';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { Mutex, MutexResourceLockedError } from '../../shared/providers/mutex';
import { Storage, type TargetSelector } from '../../shared/providers/storage';
import { TargetManager } from '../../target/providers/target-manager';
import { toGraphQLSchemaCheck } from '../to-graphql-schema-check';
import { ArtifactStorageWriter } from './artifact-storage-writer';
import type { SchemaModuleConfig } from './config';
import { SCHEMA_MODULE_CONFIG } from './config';
import { Contracts } from './contracts';
import { CompositeModel } from './models/composite';
import {
  DeleteFailureReasonCode,
  formatPolicyError,
  getReasonByCode,
  PublishFailureReasonCode,
  SchemaCheckConclusion,
  SchemaCheckResult,
  SchemaCheckWarning,
  SchemaDeleteConclusion,
  SchemaPublishConclusion,
  SchemaPublishResult,
} from './models/shared';
import { SingleModel } from './models/single';
import type { ConditionalBreakingChangeDiffConfig } from './registry-checks';
import { ensureCompositeSchemas, ensureSingleSchema } from './schema-helper';
import { SchemaManager, shouldUseLatestComposableVersion } from './schema-manager';
import { SchemaVersionHelper } from './schema-version-helper';

const schemaCheckCount = new promClient.Counter({
  name: 'registry_check_count',
  help: 'Number of schema checks',
  labelNames: ['model', 'projectType', 'conclusion'],
});

const schemaPublishCount = new promClient.Counter({
  name: 'registry_publish_count',
  help: 'Number of schema publishes',
  labelNames: ['model', 'projectType', 'conclusion'],
});

const schemaPublishUnexpectedErrorCount = new promClient.Counter({
  name: 'registry_publish_unexpected_error_count',
  help: 'Unexpected, not gracefully handled errors. E.g. from GitHub or other third-party services.',
  labelNames: ['errorName'],
});

const schemaCheckUnexpectedErrorCount = new promClient.Counter({
  name: 'registry_check_unexpected_error_count',
  help: 'Unexpected, not gracefully handled errors. E.g. from GitHub or other third-party services.',
  labelNames: ['errorName'],
});

const schemaDeleteCount = new promClient.Counter({
  name: 'registry_delete_count',
  help: 'Number of schema deletes',
  labelNames: ['model', 'projectType'],
});

export type CheckInput = Types.SchemaCheckInput;

export type DeleteInput = Types.SchemaDeleteInput;

export type PublishInput = Types.SchemaPublishInput & {
  isSchemaPublishMissingUrlErrorSelected: boolean;
};

type BreakPromise<T> = T extends Promise<infer U> ? U : never;

type PublishResult =
  | BreakPromise<ReturnType<SchemaPublisher['internalPublish']>>
  | {
      readonly __typename: 'SchemaPublishRetry';
      readonly reason: string;
    };

function registryLockId(targetId: string) {
  return `registry-lock:${targetId}`;
}

function assertNonNull<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

type ConditionalBreakingChangeConfiguration = {
  conditionalBreakingChangeDiffConfig: ConditionalBreakingChangeDiffConfig;
  retentionInDays: number;
  percentage: number;
  requestCount: number;
  breakingChangeFormula: 'PERCENTAGE' | 'REQUEST_COUNT';
  totalRequestCount: number;
};

@Injectable({
  scope: Scope.Operation,
})
export class SchemaPublisher {
  private logger: Logger;
  private models: {
    [ProjectType.SINGLE]: SingleModel;
    [ProjectType.FEDERATION]: CompositeModel;
    [ProjectType.STITCHING]: CompositeModel;
  };

  constructor(
    logger: Logger,
    private session: Session,
    private storage: Storage,
    private schemaManager: SchemaManager,
    private targetManager: TargetManager,
    private alertsManager: AlertsManager,
    private gitHubIntegrationManager: GitHubIntegrationManager,
    private distributedCache: DistributedCache,
    private artifactStorageWriter: ArtifactStorageWriter,
    private mutex: Mutex,
    private rateLimit: RateLimitProvider,
    private contracts: Contracts,
    private schemaVersionHelper: SchemaVersionHelper,
    private operationsReader: OperationsReader,
    private idTranslator: IdTranslator,
    @Inject(SCHEMA_MODULE_CONFIG) private schemaModuleConfig: SchemaModuleConfig,
    singleModel: SingleModel,
    compositeModel: CompositeModel,
  ) {
    this.logger = logger.child({ service: 'SchemaPublisher' });
    this.models = {
      [ProjectType.SINGLE]: singleModel,
      [ProjectType.FEDERATION]: compositeModel,
      [ProjectType.STITCHING]: compositeModel,
    };
  }

  private async getConditionalBreakingChangeConfiguration({
    selector,
  }: {
    selector: {
      organizationId: string;
      projectId: string;
      targetId: string;
    };
  }): Promise<ConditionalBreakingChangeConfiguration | null> {
    try {
      const settings = await this.storage.getTargetSettings(selector);

      if (!settings.validation.enabled) {
        this.logger.debug('Usage validation disabled');
        this.logger.debug('Mark all as used');
        return null;
      }

      if (settings.validation.enabled && settings.validation.targets.length === 0) {
        this.logger.debug('Usage validation enabled but no targets to check against');
        this.logger.debug('Mark all as used');
        return null;
      }

      const targetIds = settings.validation.targets;
      const excludedClientNames = settings.validation.excludedClients?.length
        ? settings.validation.excludedClients
        : null;
      const period = createPeriod(`${settings.validation.period}d`);

      const totalRequestCount = await this.operationsReader.getTotalAmountOfRequests({
        targetIds,
        excludedClients: excludedClientNames,
        period,
      });

      return {
        conditionalBreakingChangeDiffConfig: {
          period,
          targetIds,
          excludedClientNames: settings.validation.excludedClients?.length
            ? settings.validation.excludedClients
            : null,
          requestCountThreshold:
            settings.validation.breakingChangeFormula === 'PERCENTAGE'
              ? Math.ceil(totalRequestCount * (settings.validation.percentage / 100))
              : settings.validation.requestCount,
        },
        retentionInDays: settings.validation.period,
        percentage: settings.validation.percentage,
        requestCount: settings.validation.requestCount,
        breakingChangeFormula: settings.validation.breakingChangeFormula,
        totalRequestCount,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to get settings`, error);
      return null;
    }
  }

  private async getConditionalBreakingChangeMetadata(args: {
    conditionalBreakingChangeConfiguration: null | ConditionalBreakingChangeConfiguration;
    organizationId: string;
    projectId: string;
    targetId: string;
  }): Promise<null | ConditionalBreakingChangeMetadata> {
    if (args.conditionalBreakingChangeConfiguration === null) {
      return null;
    }

    const { conditionalBreakingChangeDiffConfig } = args.conditionalBreakingChangeConfiguration;

    return {
      period: conditionalBreakingChangeDiffConfig.period,
      settings: {
        retentionInDays: args.conditionalBreakingChangeConfiguration.retentionInDays,
        excludedClientNames: conditionalBreakingChangeDiffConfig.excludedClientNames,
        percentage: args.conditionalBreakingChangeConfiguration.percentage,
        requestCount: args.conditionalBreakingChangeConfiguration.requestCount,
        breakingChangeFormula: args.conditionalBreakingChangeConfiguration.breakingChangeFormula,
        targets: await Promise.all(
          conditionalBreakingChangeDiffConfig.targetIds.map(async targetId => {
            return {
              id: targetId,
              name: (
                await this.targetManager.getTargetById({
                  targetId: targetId,
                })
              ).name,
            };
          }),
        ),
      },
      usage: {
        totalRequestCount: args.conditionalBreakingChangeConfiguration.totalRequestCount,
      },
    };
  }

  @traceFn('SchemaPublisher.internalCheck', {
    initAttributes: input => ({
      'hive.organization.slug': input.target?.bySelector?.organizationSlug,
      'hive.project.slug': input.target?.bySelector?.projectSlug,
      'hive.target.slug': input.target?.bySelector?.targetSlug,
      'hive.target.id': input.target?.byId ?? undefined,
    }),
    resultAttributes: result => ({
      'hive.check.result': result.__typename,
    }),
  })
  private async internalCheck(input: CheckInput) {
    this.logger.info('Checking schema (input=%o)', lodash.omit(input, ['sdl']));

    const selector = await this.idTranslator.resolveTargetReference({
      reference: input.target ?? null,
      onError() {
        throw new InsufficientPermissionError('schemaCheck:create');
      },
    });

    trace.getActiveSpan()?.setAttributes({
      'hive.organization.id': selector.organizationId,
      'hive.target.id': selector.targetId,
      'hive.project.id': selector.projectId,
    });

    await this.session.assertPerformAction({
      action: 'schemaCheck:create',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
        serviceName: input.service ?? null,
      },
    });

    const [target, project, organization, latestVersion, latestComposableVersion] =
      await Promise.all([
        this.storage.getTarget({
          organizationId: selector.organizationId,
          projectId: selector.projectId,
          targetId: selector.targetId,
        }),
        this.storage.getProject({
          organizationId: selector.organizationId,
          projectId: selector.projectId,
        }),
        this.storage.getOrganization({
          organizationId: selector.organizationId,
        }),
        this.storage.getLatestSchemas({
          organizationId: selector.organizationId,
          projectId: selector.projectId,
          targetId: selector.targetId,
        }),
        this.storage.getLatestSchemas({
          organizationId: selector.organizationId,
          projectId: selector.projectId,
          targetId: selector.targetId,
          onlyComposable: true,
        }),
      ]);

    const [latestSchemaVersion, latestComposableSchemaVersion] = await Promise.all([
      this.schemaManager.getMaybeLatestVersion(target),
      this.schemaManager.getMaybeLatestValidVersion(target),
    ]);

    function increaseSchemaCheckCountMetric(conclusion: 'rejected' | 'accepted') {
      schemaCheckCount.inc({
        model: 'modern',
        projectType: project.type,
        conclusion,
      });
    }

    // if url is provided but this is not a distributed project
    if (
      input.url != null &&
      !(project.type === ProjectType.FEDERATION || project.type === ProjectType.STITCHING)
    ) {
      this.logger.debug('url is only supported by distributed projects (type=%s)', project.type);
      increaseSchemaCheckCountMetric('rejected');

      return {
        __typename: 'SchemaCheckError',
        valid: false,
        changes: [],
        warnings: [],
        errors: [
          {
            message: 'url is only supported by distributed projects',
          },
        ],
      } as const;
    }

    if (
      (project.type === ProjectType.FEDERATION || project.type === ProjectType.STITCHING) &&
      input.service == null
    ) {
      this.logger.debug('No service name provided (type=%s)', project.type);
      increaseSchemaCheckCountMetric('rejected');

      return {
        __typename: 'SchemaCheckError',
        valid: false,
        changes: [],
        warnings: [],
        errors: [
          {
            message: 'Missing service name',
          },
        ],
      } as const;
    }

    let githubCheckRun: GitHubCheckRun | null = null;

    {
      let github: null | {
        repository: `${string}/${string}`;
        sha: string;
      } = null;

      if (input.github) {
        if (input.github.repository) {
          if (!isGitHubRepositoryString(input.github.repository)) {
            this.logger.debug(
              'Invalid github repository name provided (repository=%s)',
              input.github.repository,
            );
            increaseSchemaCheckCountMetric('rejected');
            return {
              __typename: 'GitHubSchemaCheckError' as const,
              message: 'Invalid github repository name provided.',
            };
          }
          github = {
            repository: input.github.repository,
            sha: input.github.commit,
          };
        } else if (project.gitRepository == null) {
          this.logger.debug(
            'Git repository is not configured for this project (project=%s)',
            project.id,
          );
          increaseSchemaCheckCountMetric('rejected');
          return {
            __typename: 'GitHubSchemaCheckError' as const,
            message: 'Git repository is not configured for this project.',
          };
        } else {
          github = {
            repository: project.gitRepository,
            sha: input.github.commit,
          };
        }
      }

      if (github != null) {
        const result = await this.createGithubCheckRunStartForSchemaCheck({
          organization,
          project,
          target,
          serviceName: input.service ?? null,
          github: {
            owner: github.repository.split('/')[0],
            repository: github.repository.split('/')[1],
            sha: github.sha,
          },
        });

        if (result.success === false) {
          increaseSchemaCheckCountMetric('rejected');
          return {
            __typename: 'GitHubSchemaCheckError' as const,
            message: result.error,
          };
        }

        githubCheckRun = result.data;
      }
    }

    let contextId: string | null = null;

    if (input.contextId !== undefined) {
      const result = SchemaCheckContextIdModel.safeParse(input.contextId);
      if (!result.success) {
        return {
          __typename: 'SchemaCheckError',
          valid: false,
          changes: [],
          warnings: [],
          errors: [
            {
              message: result.error.errors[0].message,
            },
          ],
        } as const;
      }
      contextId = result.data;
    } else if (input.github?.repository && input.github.pullRequestNumber) {
      contextId = `${input.github.repository}#${input.github.pullRequestNumber}`;
    }

    await this.schemaManager.completeGetStartedCheck({
      organizationId: project.orgId,
      step: 'checkingSchema',
    });

    const baseSchema = await this.schemaManager.getBaseSchemaForTarget(target);

    const sdl = tryPrettifySDL(input.sdl);

    const activeContracts =
      project.type === ProjectType.FEDERATION
        ? await this.contracts.loadActiveContractsWithLatestValidContractVersionsByTargetId({
            targetId: target.id,
          })
        : null;

    let checkResult: SchemaCheckResult;

    let approvedSchemaChanges: Map<string, SchemaChangeType> | null = new Map();
    let approvedContractChanges: Map<string, Map<string, SchemaChangeType>> | null = null;

    if (contextId !== null) {
      approvedSchemaChanges = await this.storage.getApprovedSchemaChangesForContextId({
        targetId: target.id,
        contextId,
      });

      if (activeContracts?.length) {
        approvedContractChanges = await this.contracts.getApprovedSchemaChangesForContracts({
          contextId,
          contractIds: activeContracts.map(contract => contract.contract.id),
        });
      }
    }

    const contractVersionIdByContractName = new Map<string, string>();
    activeContracts?.forEach(contract => {
      if (!contract.latestValidVersion) {
        return;
      }
      contractVersionIdByContractName.set(
        contract.latestValidVersion.contractName,
        contract.latestValidVersion.id,
      );
    });

    const conditionalBreakingChangeConfiguration =
      await this.getConditionalBreakingChangeConfiguration({
        selector,
      });

    const latestSchemaVersionContracts = latestSchemaVersion
      ? await this.contracts.getContractVersionsForSchemaVersion({
          schemaVersionId: latestSchemaVersion.id,
        })
      : null;

    switch (project.type) {
      case ProjectType.SINGLE:
        this.logger.debug('Using SINGLE registry model');
        checkResult = await this.models[ProjectType.SINGLE].check({
          input,
          selector,
          latest: latestVersion
            ? {
                isComposable: latestVersion.valid,
                sdl: latestSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: [ensureSingleSchema(latestVersion.schemas)],
              }
            : null,
          latestComposable: latestComposableVersion
            ? {
                isComposable: latestComposableVersion.valid,
                sdl: latestComposableSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: [ensureSingleSchema(latestComposableVersion.schemas)],
              }
            : null,
          baseSchema,
          project,
          organization,
          approvedChanges: approvedSchemaChanges,
          conditionalBreakingChangeDiffConfig:
            conditionalBreakingChangeConfiguration?.conditionalBreakingChangeDiffConfig ?? null,
        });
        break;
      case ProjectType.FEDERATION:
      case ProjectType.STITCHING:
        this.logger.debug('Using %s registry model', project.type);

        if (!input.service) {
          throw new Error('Guard for TypeScript limitations on inferring types. :)');
        }

        checkResult = await this.models[project.type].check({
          input: {
            sdl,
            serviceName: input.service,
            url: input.url ?? null,
          },
          selector,
          latest: latestVersion
            ? {
                isComposable: latestVersion.valid,
                sdl: latestSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: ensureCompositeSchemas(latestVersion.schemas),
                contractNames:
                  latestSchemaVersionContracts?.edges.map(edge => edge.node.contractName) ?? null,
              }
            : null,
          latestComposable: latestComposableVersion
            ? {
                isComposable: latestComposableVersion.valid,
                sdl: latestComposableSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: ensureCompositeSchemas(latestComposableVersion.schemas),
              }
            : null,
          baseSchema,
          project,
          organization,
          approvedChanges: approvedSchemaChanges,
          contracts:
            activeContracts?.map(contract => ({
              ...contract,
              approvedChanges: approvedContractChanges?.get(contract.contract.id) ?? null,
            })) ?? null,
          conditionalBreakingChangeDiffConfig:
            conditionalBreakingChangeConfiguration?.conditionalBreakingChangeDiffConfig ?? null,
        });
        break;
      default:
        this.logger.debug('Unsupported project type (type=%s)', project.type);
        throw new HiveError(`${project.type} project not supported`);
    }

    let schemaCheck: null | SchemaCheck = null;

    const retention = await this.rateLimit.getRetention({ targetId: target.id });
    const expiresAt = retention ? new Date(Date.now() + retention * millisecondsPerDay) : null;

    if (checkResult.conclusion === SchemaCheckConclusion.Failure) {
      schemaCheck = await this.storage.createSchemaCheck({
        schemaSDL: sdl,
        serviceName: input.service ?? null,
        meta: input.meta ?? null,
        targetId: target.id,
        schemaVersionId: latestVersion?.versionId ?? null,
        isSuccess: false,
        breakingSchemaChanges: checkResult.state.schemaChanges?.breaking ?? null,
        safeSchemaChanges: checkResult.state.schemaChanges?.safe ?? null,
        schemaPolicyWarnings: checkResult.state.schemaPolicy?.warnings ?? null,
        schemaPolicyErrors: checkResult.state.schemaPolicy?.errors ?? null,
        ...(checkResult.state.composition.errors
          ? {
              schemaCompositionErrors: checkResult.state.composition.errors,
              compositeSchemaSDL: null,
              supergraphSDL: null,
            }
          : {
              schemaCompositionErrors: null,
              compositeSchemaSDL: checkResult.state.composition.compositeSchemaSDL,
              supergraphSDL: checkResult.state.composition.supergraphSDL,
            }),
        isManuallyApproved: false,
        manualApprovalUserId: null,
        githubCheckRunId: githubCheckRun?.id ?? null,
        githubRepository: githubCheckRun
          ? githubCheckRun.owner + '/' + githubCheckRun.repository
          : null,
        githubSha: githubCheckRun?.commit ?? null,
        expiresAt,
        contextId,
        conditionalBreakingChangeMetadata: await this.getConditionalBreakingChangeMetadata({
          conditionalBreakingChangeConfiguration,
          organizationId: project.orgId,
          projectId: project.id,
          targetId: target.id,
        }),
        contracts:
          checkResult.state.contracts?.map(contract => ({
            contractId: contract.contractId,
            contractName: contract.contractName,
            comparedContractVersionId:
              contractVersionIdByContractName.get(contract.contractName) ?? null,
            isSuccess: contract.isSuccessful,
            compositeSchemaSdl: contract.composition.compositeSchemaSDL,
            supergraphSchemaSdl: contract.composition.supergraphSDL,
            schemaCompositionErrors: contract.composition.errors ?? null,
            breakingSchemaChanges: contract.schemaChanges?.breaking ?? null,
            safeSchemaChanges: contract.schemaChanges?.safe ?? null,
          })) ?? null,
      });
    } else if (checkResult.conclusion === SchemaCheckConclusion.Success) {
      schemaCheck = await this.storage.createSchemaCheck({
        schemaSDL: sdl,
        serviceName: input.service ?? null,
        meta: input.meta ?? null,
        targetId: target.id,
        schemaVersionId: latestVersion?.versionId ?? null,
        isSuccess: true,
        breakingSchemaChanges: checkResult.state?.schemaChanges?.breaking ?? null,
        safeSchemaChanges: checkResult.state?.schemaChanges?.safe ?? null,
        schemaPolicyWarnings: checkResult.state?.schemaPolicyWarnings ?? null,
        schemaPolicyErrors: null,
        schemaCompositionErrors: null,
        compositeSchemaSDL: checkResult.state.composition.compositeSchemaSDL,
        supergraphSDL: checkResult.state.composition.supergraphSDL,
        isManuallyApproved: false,
        manualApprovalUserId: null,
        githubCheckRunId: githubCheckRun?.id ?? null,
        githubRepository: githubCheckRun
          ? githubCheckRun.owner + '/' + githubCheckRun.repository
          : null,
        githubSha: githubCheckRun?.commit ?? null,
        expiresAt,
        contextId,
        conditionalBreakingChangeMetadata: await this.getConditionalBreakingChangeMetadata({
          conditionalBreakingChangeConfiguration,
          organizationId: project.orgId,
          projectId: project.id,
          targetId: target.id,
        }),
        contracts:
          checkResult.state?.contracts?.map(contract => ({
            contractId: contract.contractId,
            contractName: contract.contractName,
            comparedContractVersionId:
              contractVersionIdByContractName.get(contract.contractName) ?? null,
            isSuccess: contract.isSuccessful,
            compositeSchemaSdl: contract.composition.compositeSchemaSDL,
            supergraphSchemaSdl: contract.composition.supergraphSDL,
            schemaCompositionErrors: null,
            breakingSchemaChanges: contract.schemaChanges?.breaking ?? null,
            safeSchemaChanges: contract.schemaChanges?.safe ?? null,
          })) ?? null,
      });
    } else if (checkResult.conclusion === SchemaCheckConclusion.Skip) {
      if (!latestVersion || !latestSchemaVersion) {
        throw new Error('This cannot happen 1 :)');
      }

      const [compositeSchemaSdl, supergraphSdl, compositionErrors] = await Promise.all([
        this.schemaVersionHelper.getCompositeSchemaSdl(latestSchemaVersion),
        this.schemaVersionHelper.getSupergraphSdl(latestSchemaVersion),
        this.schemaVersionHelper.getSchemaCompositionErrors(latestSchemaVersion),
      ]);

      schemaCheck = await this.storage.createSchemaCheck({
        schemaSDL: sdl,
        serviceName: input.service ?? null,
        meta: input.meta ?? null,
        targetId: target.id,
        schemaVersionId: latestSchemaVersion.id ?? null,
        breakingSchemaChanges: null,
        safeSchemaChanges: null,
        schemaPolicyWarnings: null,
        schemaPolicyErrors: null,
        ...(compositeSchemaSdl
          ? {
              isSuccess: true,
              schemaCompositionErrors: null,
              compositeSchemaSDL: compositeSchemaSdl,
              supergraphSDL: supergraphSdl,
            }
          : {
              isSuccess: false,
              schemaCompositionErrors: assertNonNull(
                compositionErrors,
                'Composite Schema SDL, but no composition errors.',
              ),
              compositeSchemaSDL: null,
              supergraphSDL: null,
            }),
        isManuallyApproved: false,
        manualApprovalUserId: null,
        githubCheckRunId: githubCheckRun?.id ?? null,
        githubRepository: githubCheckRun
          ? githubCheckRun.owner + '/' + githubCheckRun.repository
          : null,
        githubSha: githubCheckRun?.commit ?? null,
        expiresAt,
        contextId,
        conditionalBreakingChangeMetadata: await this.getConditionalBreakingChangeMetadata({
          conditionalBreakingChangeConfiguration,
          organizationId: project.orgId,
          projectId: project.id,
          targetId: target.id,
        }),
        contracts: latestSchemaVersionContracts
          ? await Promise.all(
              latestSchemaVersionContracts?.edges.map(async edge => ({
                contractId: edge.node.contractId,
                contractName: edge.node.contractName,
                comparedContractVersionId:
                  edge.node.schemaCompositionErrors === null
                    ? edge.node.id
                    : // if this version is not composable - we need to get the previous composable version
                      await this.contracts
                        .getDiffableContractVersionForContractVersion({
                          contractVersion: edge.node,
                        })
                        .then(contractVersion => contractVersion?.id ?? null),
                isSuccess: !!edge.node.schemaCompositionErrors,
                compositeSchemaSdl: edge.node.compositeSchemaSdl,
                supergraphSchemaSdl: edge.node.supergraphSdl,
                schemaCompositionErrors: edge.node.schemaCompositionErrors,
                breakingSchemaChanges: null,
                safeSchemaChanges: null,
              })),
            )
          : null,
      });
    }

    if (githubCheckRun) {
      if (checkResult.conclusion === SchemaCheckConclusion.Success) {
        const failedContractCompositionCount =
          checkResult.state.contracts?.filter(c => !c.isSuccessful).length ?? 0;

        increaseSchemaCheckCountMetric('accepted');
        return await this.updateGithubCheckRunForSchemaCheck({
          project,
          target,
          organization,
          conclusion: checkResult.conclusion,
          changes: checkResult.state?.schemaChanges?.all ?? null,
          breakingChanges: checkResult.state?.schemaChanges?.breaking ?? null,
          warnings: checkResult.state?.schemaPolicyWarnings ?? null,
          compositionErrors: null,
          errors: null,
          schemaCheckId: schemaCheck?.id ?? null,
          githubCheckRun: githubCheckRun,
          failedContractCompositionCount,
        });
      }

      if (checkResult.conclusion === SchemaCheckConclusion.Failure) {
        const failedContractCompositionCount =
          checkResult.state.contracts?.filter(c => !c.isSuccessful).length ?? 0;

        increaseSchemaCheckCountMetric('rejected');
        return await this.updateGithubCheckRunForSchemaCheck({
          project,
          target,
          organization,
          conclusion: checkResult.conclusion,
          changes: [
            ...(checkResult.state.schemaChanges?.breaking ?? []),
            ...(checkResult.state.schemaChanges?.safe ?? []),
          ],
          breakingChanges: checkResult.state.schemaChanges?.breaking ?? [],
          compositionErrors: checkResult.state.composition.errors ?? [],
          warnings: checkResult.state.schemaPolicy?.warnings ?? [],
          errors: checkResult.state.schemaPolicy?.errors?.map(formatPolicyError) ?? [],
          schemaCheckId: schemaCheck?.id ?? null,
          githubCheckRun: githubCheckRun,
          failedContractCompositionCount,
        });
      }

      // SchemaCheckConclusion.Skip

      if (!latestVersion || !latestSchemaVersion) {
        throw new Error('This cannot happen 2 :)');
      }

      if (latestSchemaVersion.isComposable) {
        increaseSchemaCheckCountMetric('accepted');
        const contracts = await this.contracts.getContractVersionsForSchemaVersion({
          schemaVersionId: latestSchemaVersion.id,
        });
        const failedContractCompositionCount =
          contracts?.edges.filter(edge => edge.node.schemaCompositionErrors !== null).length ?? 0;

        return await this.updateGithubCheckRunForSchemaCheck({
          project,
          target,
          organization,
          conclusion: SchemaCheckConclusion.Success,
          changes: null,
          breakingChanges: null,
          warnings: null,
          compositionErrors: null,
          errors: null,
          schemaCheckId: schemaCheck?.id ?? null,
          githubCheckRun: githubCheckRun,
          failedContractCompositionCount,
        });
      }

      increaseSchemaCheckCountMetric('rejected');
      return await this.updateGithubCheckRunForSchemaCheck({
        project,
        target,
        organization,
        conclusion: SchemaCheckConclusion.Failure,
        changes: null,
        breakingChanges: null,
        compositionErrors: latestSchemaVersion.schemaCompositionErrors,
        warnings: null,
        errors: null,
        schemaCheckId: schemaCheck?.id ?? null,
        githubCheckRun: githubCheckRun,
        failedContractCompositionCount: 0,
      });
    }

    if (schemaCheck == null) {
      throw new Error('Invalid state. Schema check can not be null at this point.');
    }

    const schemaCheckSelector = {
      organizationId: target.orgId,
      projectId: target.projectId,
    };

    if (checkResult.conclusion === SchemaCheckConclusion.Success) {
      increaseSchemaCheckCountMetric('accepted');
      return {
        __typename: 'SchemaCheckSuccess',
        valid: true,
        changes: [
          ...(checkResult.state?.schemaChanges?.all ?? []),
          ...(checkResult.state?.contracts?.flatMap(contract => [
            ...(contract.schemaChanges?.all?.map(change => ({
              ...change,
              message: `[${contract.contractName}] ${change.message}`,
            })) ?? []),
          ]) ?? []),
        ],
        warnings: checkResult.state?.schemaPolicyWarnings ?? [],
        initial: latestVersion == null,
        schemaCheck: toGraphQLSchemaCheck(schemaCheckSelector, schemaCheck),
      } as const;
    }

    if (checkResult.conclusion === SchemaCheckConclusion.Failure) {
      increaseSchemaCheckCountMetric('rejected');

      return {
        __typename: 'SchemaCheckError',
        valid: false,
        changes: [
          ...(checkResult.state.schemaChanges?.all ?? []),
          ...(checkResult.state.contracts?.flatMap(contract => [
            ...(contract.schemaChanges?.all?.map(change => ({
              ...change,
              message: `[${contract.contractName}] ${change.message}`,
            })) ?? []),
          ]) ?? []),
        ],
        warnings: checkResult.state.schemaPolicy?.warnings ?? [],
        errors: [
          ...(checkResult.state.schemaChanges?.breaking?.filter(
            breaking => breaking.approvalMetadata == null && breaking.isSafeBasedOnUsage === false,
          ) ?? []),
          ...(checkResult.state.schemaPolicy?.errors?.map(formatPolicyError) ?? []),
          ...(checkResult.state.composition.errors ?? []),
          ...(checkResult.state.contracts?.flatMap(contract => [
            ...(contract.composition.errors?.map(error => ({
              message: `[${contract.contractName}] ${error.message}`,
              source: error.source,
            })) ?? []),
          ]) ?? []),
          ...(checkResult.state.contracts?.flatMap(contract => [
            ...(contract.schemaChanges?.breaking
              ?.filter(
                breaking =>
                  breaking.approvalMetadata == null && breaking.isSafeBasedOnUsage === false,
              )
              .map(change => ({
                ...change,
                message: `[${contract.contractName}] ${change.message}`,
              })) ?? []),
          ]) ?? []),
        ],
        schemaCheck: toGraphQLSchemaCheck(schemaCheckSelector, schemaCheck),
      } as const;
    }

    // SchemaCheckConclusion.Skip

    if (!latestVersion || !latestSchemaVersion) {
      throw new Error('This cannot happen 3 :)');
    }

    if (latestSchemaVersion.isComposable) {
      increaseSchemaCheckCountMetric('accepted');
      return {
        __typename: 'SchemaCheckSuccess',
        valid: true,
        changes: [],
        warnings: [],
        initial: false,
        schemaCheck: toGraphQLSchemaCheck(schemaCheckSelector, schemaCheck),
      } as const;
    }

    const contractVersions = await this.contracts.getContractVersionsForSchemaVersion({
      schemaVersionId: latestSchemaVersion.id,
    });

    increaseSchemaCheckCountMetric('rejected');
    return {
      __typename: 'SchemaCheckError',
      valid: false,
      changes: [],
      warnings: [],
      errors: [
        ...(latestSchemaVersion.schemaCompositionErrors?.map(error => ({
          message: error.message,
          source: error.source,
        })) ?? []),
        ...(contractVersions?.edges.flatMap(edge => [
          ...(edge.node.schemaCompositionErrors?.map(error => ({
            message: `[${edge.node.contractName}] ${error.message}`,
            source: error.source,
          })) ?? []),
        ]) ?? []),
      ],
      schemaCheck: toGraphQLSchemaCheck(schemaCheckSelector, schemaCheck),
    } as const;
  }

  async check(input: CheckInput) {
    return await this.internalCheck(input).catch(error => {
      if (error instanceof HiveError === false) {
        schemaCheckUnexpectedErrorCount.inc({
          errorName: (error instanceof Error && error.name) || 'unknown',
        });
      }

      throw error;
    });
  }

  @traceFn('SchemaPublisher.publish', {
    initAttributes: (input, _) => ({
      'hive.organization.slug': input.target?.bySelector?.organizationSlug,
      'hive.project.slug': input.target?.bySelector?.projectSlug,
      'hive.target.slug': input.target?.bySelector?.targetSlug,
      'hive.target.id': input.target?.byId ?? undefined,
    }),
    resultAttributes: result => ({
      'hive.publish.result': result.__typename,
    }),
  })
  async publish(input: PublishInput, signal: AbortSignal): Promise<PublishResult> {
    this.logger.debug('Start schema publication.');

    const selector = await this.idTranslator.resolveTargetReference({
      reference: input.target ?? null,
      onError() {
        throw new InsufficientPermissionError('schemaVersion:publish');
      },
    });

    trace.getActiveSpan()?.setAttributes({
      'hive.organization.id': selector.organizationId,
      'hive.target.id': selector.targetId,
      'hive.project.id': selector.projectId,
    });

    await this.session.assertPerformAction({
      action: 'schemaVersion:publish',
      organizationId: selector.organizationId,
      params: {
        targetId: selector.targetId,
        projectId: selector.projectId,
        organizationId: selector.organizationId,
        serviceName: input.service ?? null,
      },
    });

    this.logger.debug(
      'Compute hash (organization=%s, project=%s, target=%s)',
      selector.organizationId,
      selector.projectId,
      selector.targetId,
    );

    const target = await this.storage.getTarget({
      organizationId: selector.organizationId,
      projectId: selector.projectId,
      targetId: selector.targetId,
    });

    const [contracts, latestVersion] = await Promise.all([
      this.contracts.getActiveContractsByTargetId({ targetId: selector.targetId }),
      this.schemaManager.getMaybeLatestVersion(target),
    ]);

    const legacySelector = this.session.getLegacySelector();

    const checksum = createHash('md5')
      .update(
        stringify({
          ...input,
          organization: selector.organizationId,
          project: selector.projectId,
          target: selector.targetId,
          service: input.service?.toLowerCase(),
          contracts: contracts?.map(contract => ({
            contractId: contract.id,
            contractName: contract.contractName,
          })),
          // We include the latest version ID to avoid caching a schema publication that targets different versions.
          // When deleting a schema, and publishing it again, the latest version ID will be different.
          // If we don't include it, the cache will return the previous result.
          latestVersionId: latestVersion?.id,
        }),
      )
      .update(legacySelector.token)
      .digest('base64');

    this.logger.debug(
      'Hash computation finished (organization=%s, project=%s, target=%s, hash=%s)',
      selector.organizationId,
      selector.projectId,
      selector.targetId,
    );

    return this.mutex
      .perform(
        registryLockId(selector.targetId),
        {
          /**
           * The global request timeout is 60 seconds.
           * We don't want to try acquiring the lock longer than 30 seconds.
           * If it succeeds after 30 seconds,
           * we have 30 seconds for actually running the business logic.
           *
           * If we would wait longer we risk the user facing 504 errors.
           */
          retries: 30,
          retryDelay: 1_000,
          signal,
        },
        async () => {
          return this.distributedCache.wrap({
            key: `schema:publish:${checksum}`,
            ttlSeconds: 15,
            executor: () =>
              this.internalPublish({
                ...input,
                checksum,
                selector,
              }),
          });
        },
      )
      .catch((error: unknown) => {
        if (error instanceof MutexResourceLockedError && input.supportsRetry === true) {
          return {
            __typename: 'SchemaPublishRetry',
            reason: 'Another schema publish is currently in progress.',
          } satisfies PublishResult;
        }

        if (error instanceof HiveError === false) {
          schemaPublishUnexpectedErrorCount.inc({
            errorName: (error instanceof Error && error.name) || 'unknown',
          });
        }

        throw error;
      });
  }

  @traceFn('SchemaPublisher.delete', {
    initAttributes: (input, _) => ({
      'hive.organization.slug': input.target?.bySelector?.organizationSlug,
      'hive.project.slug': input.target?.bySelector?.projectSlug,
      'hive.target.slug': input.target?.bySelector?.targetSlug,
      'hive.target.id': input.target?.byId ?? undefined,
    }),
    resultAttributes: result => ({
      'hive.delete.result': result.__typename,
    }),
  })
  async delete(input: DeleteInput, signal: AbortSignal) {
    this.logger.info('Deleting schema (input=%o)', input);

    const selector = await this.idTranslator.resolveTargetReference({
      reference: input.target ?? null,
      onError() {
        throw new InsufficientPermissionError('schemaVersion:deleteService');
      },
    });

    trace.getActiveSpan()?.setAttributes({
      'hive.organization.id': selector.organizationId,
      'hive.target.id': selector.targetId,
      'hive.project.id': selector.projectId,
    });

    await this.session.assertPerformAction({
      action: 'schemaVersion:deleteService',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
        serviceName: input.serviceName,
      },
    });

    return this.mutex.perform(
      registryLockId(selector.targetId),
      {
        signal,
      },
      async () => {
        const [organization, project, target, latestVersion, latestComposableVersion, baseSchema] =
          await Promise.all([
            this.storage.getOrganization({
              organizationId: selector.organizationId,
            }),
            this.storage.getProject({
              organizationId: selector.organizationId,
              projectId: selector.projectId,
            }),
            this.storage.getTarget({
              organizationId: selector.organizationId,
              projectId: selector.projectId,
              targetId: selector.targetId,
            }),
            this.storage.getLatestSchemas({
              organizationId: selector.organizationId,
              projectId: selector.projectId,
              targetId: selector.targetId,
            }),
            this.storage.getLatestSchemas({
              organizationId: selector.organizationId,
              projectId: selector.projectId,
              targetId: selector.targetId,
              onlyComposable: true,
            }),
            this.storage.getBaseSchema({
              organizationId: selector.organizationId,
              projectId: selector.projectId,
              targetId: selector.targetId,
            }),
          ]);

        const [latestSchemaVersion, latestComposableSchemaVersion] = await Promise.all([
          this.schemaManager.getMaybeLatestVersion(target),
          this.schemaManager.getMaybeLatestValidVersion(target),
        ]);

        const compareToPreviousComposableVersion = shouldUseLatestComposableVersion(
          selector.targetId,
          project,
          organization,
        );

        schemaDeleteCount.inc({ model: 'modern', projectType: project.type });

        if (project.type !== ProjectType.FEDERATION && project.type !== ProjectType.STITCHING) {
          throw new HiveError(`${project.type} project not supported`);
        }

        if (!latestVersion || latestVersion.schemas.length === 0) {
          throw new HiveError('Registry is empty');
        }

        const schemas = ensureCompositeSchemas(latestVersion.schemas);
        this.logger.debug(`Found ${latestVersion?.schemas.length ?? 0} most recent schemas`);
        this.logger.debug(
          'Using %s registry model (featureFlags=%o)',
          project.type,
          organization.featureFlags,
        );

        const serviceExists = schemas.some(s => s.service_name === input.serviceName);

        if (!serviceExists) {
          return {
            __typename: 'SchemaDeleteError',
            valid: latestVersion.valid,
            errors: [
              {
                message: `Service "${input.serviceName}" not found`,
              },
            ],
          } as const;
        }

        const conditionalBreakingChangeConfiguration =
          await this.getConditionalBreakingChangeConfiguration({
            selector: {
              targetId: selector.targetId,
              projectId: selector.projectId,
              organizationId: selector.organizationId,
            },
          });

        const contracts =
          project.type === ProjectType.FEDERATION
            ? await this.contracts.loadActiveContractsWithLatestValidContractVersionsByTargetId({
                targetId: selector.targetId,
              })
            : null;

        const deleteResult = await this.models[project.type].delete({
          input: {
            serviceName: input.serviceName,
          },
          latest: {
            isComposable: latestVersion.valid,
            sdl: latestSchemaVersion?.compositeSchemaSDL ?? null,
            schemas,
          },
          latestComposable: latestComposableVersion
            ? {
                isComposable: latestComposableVersion.valid,
                sdl: latestComposableSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: ensureCompositeSchemas(latestComposableVersion.schemas),
              }
            : null,
          baseSchema,
          project,
          organization,
          selector: {
            target: selector.targetId,
            project: selector.projectId,
            organization: selector.organizationId,
          },
          conditionalBreakingChangeDiffConfig:
            conditionalBreakingChangeConfiguration?.conditionalBreakingChangeDiffConfig ?? null,
          contracts,
        });

        let diffSchemaVersionId: string | null = null;
        if (compareToPreviousComposableVersion && latestComposableSchemaVersion) {
          diffSchemaVersionId = latestComposableSchemaVersion.id;
        }

        if (!compareToPreviousComposableVersion && latestSchemaVersion) {
          diffSchemaVersionId = latestSchemaVersion.id;
        }

        if (deleteResult.conclusion === SchemaDeleteConclusion.Accept) {
          this.logger.debug('Delete accepted');
          if (input.dryRun !== true) {
            const schemaVersion = await this.storage.deleteSchema({
              organizationId: selector.organizationId,
              projectId: selector.projectId,
              targetId: selector.targetId,
              serviceName: input.serviceName,
              composable: deleteResult.state.composable,
              diffSchemaVersionId,
              changes: deleteResult.state.changes,
              coordinatesDiff: deleteResult.state.coordinatesDiff,
              contracts:
                deleteResult.state.contracts?.map(contract => ({
                  contractId: contract.contractId,
                  contractName: contract.contractName,
                  compositeSchemaSDL: contract.fullSchemaSdl,
                  supergraphSDL: contract.supergraph,
                  schemaCompositionErrors: contract.compositionErrors,
                  changes: contract.changes,
                })) ?? null,
              ...(deleteResult.state.fullSchemaSdl
                ? {
                    compositeSchemaSDL: deleteResult.state.fullSchemaSdl,
                    supergraphSDL: deleteResult.state.supergraph,
                    schemaCompositionErrors: null,
                    tags: deleteResult.state.tags,
                    schemaMetadata: deleteResult.state.schemaMetadata,
                    metadataAttributes: deleteResult.state.metadataAttributes,
                  }
                : {
                    compositeSchemaSDL: null,
                    supergraphSDL: null,
                    schemaCompositionErrors: deleteResult.state.compositionErrors ?? [],
                    tags: null,
                    schemaMetadata: null,
                    metadataAttributes: null,
                  }),
              actionFn: async () => {
                if (deleteResult.state.composable) {
                  const contracts: Array<{ name: string; sdl: string; supergraph: string }> = [];
                  for (const contract of deleteResult.state.contracts ?? []) {
                    if (contract.fullSchemaSdl && contract.supergraph) {
                      contracts.push({
                        name: contract.contractName,
                        sdl: contract.fullSchemaSdl,
                        supergraph: contract.supergraph,
                      });
                    }
                  }

                  await this.publishToCDN({
                    target,
                    project,
                    supergraph: deleteResult.state.supergraph,
                    fullSchemaSdl: deleteResult.state.fullSchemaSdl,
                    // pass all schemas except the one we are deleting
                    schemas: deleteResult.state.schemas,
                    contracts,
                  });
                }
              },
              conditionalBreakingChangeMetadata: await this.getConditionalBreakingChangeMetadata({
                conditionalBreakingChangeConfiguration,
                organizationId: selector.organizationId,
                projectId: selector.projectId,
                targetId: selector.targetId,
              }),
            });

            const changes = deleteResult.state.changes ?? [];
            const errors = [
              ...(deleteResult.state.compositionErrors ?? []),
              ...(deleteResult.state.breakingChanges ?? []).map(change => ({
                message: change.message,
                // triggerSchemaChangeNotifications.errors accepts only path as array
                path: change.path ? [change.path] : undefined,
              })),
            ];

            if ((Array.isArray(changes) && changes.length > 0) || errors.length > 0) {
              void this.alertsManager
                .triggerSchemaChangeNotifications({
                  organization,
                  project,
                  target,
                  schema: {
                    id: schemaVersion.versionId,
                    commit: schemaVersion.id,
                    valid: deleteResult.state.composable,
                  },
                  changes,
                  messages: [],
                  errors,
                  initial: false,
                })
                .catch(err => {
                  this.logger.error('Failed to trigger schema change notifications', err);
                });
            }
          }

          return {
            __typename: 'SchemaDeleteSuccess',
            valid: deleteResult.state.composable,
            changes: deleteResult.state.changes,
            errors: [
              ...(deleteResult.state.compositionErrors ?? []),
              ...(deleteResult.state.breakingChanges ?? []),
            ],
          } as const;
        }

        this.logger.debug('Delete rejected');

        const errors = [];

        const compositionErrors = getReasonByCode(
          deleteResult.reasons,
          DeleteFailureReasonCode.CompositionFailure,
        )?.compositionErrors;

        if (getReasonByCode(deleteResult.reasons, DeleteFailureReasonCode.MissingServiceName)) {
          errors.push({
            message: 'Service name is required',
          });
        }

        if (compositionErrors?.length) {
          errors.push(...compositionErrors);
        }

        return {
          __typename: 'SchemaDeleteError',
          valid: false,
          errors,
        } as const;
      },
    );
  }

  private async internalPublish(
    input: PublishInput & {
      checksum: string;
      selector: TargetSelector;
    },
  ) {
    const [organizationId, projectId, targetId] = [
      input.selector.organizationId,
      input.selector.projectId,
      input.selector.targetId,
    ];
    this.logger.info('Publishing schema (input=%o)', {
      ...lodash.omit(input, ['sdl', 'organization', 'project', 'target', 'metadata']),
      organization: organizationId,
      project: projectId,
      target: targetId,
      sdl: input.sdl.length,
      checksum: input.checksum,
      experimental_accept_breaking_changes: input.experimental_acceptBreakingChanges === true,
      metadata: !!input.metadata,
    });

    const [organization, project, target, latestVersion, latestComposable, baseSchema] =
      await Promise.all([
        this.storage.getOrganization({
          organizationId: organizationId,
        }),
        this.storage.getProject({
          organizationId: organizationId,
          projectId: projectId,
        }),
        this.storage.getTarget({
          organizationId: organizationId,
          projectId: projectId,
          targetId: targetId,
        }),
        this.storage.getLatestSchemas({
          organizationId: organizationId,
          projectId: projectId,
          targetId: targetId,
        }),
        this.storage.getLatestSchemas({
          organizationId: organizationId,
          projectId: projectId,
          targetId: targetId,
          onlyComposable: true,
        }),
        this.storage.getBaseSchema({
          organizationId: organizationId,
          projectId: projectId,
          targetId: targetId,
        }),
      ]);

    const [latestSchemaVersion, latestComposableSchemaVersion] = await Promise.all([
      this.schemaManager.getMaybeLatestVersion(target),
      this.schemaManager.getMaybeLatestValidVersion(target),
    ]);

    function increaseSchemaPublishCountMetric(conclusion: 'rejected' | 'accepted' | 'ignored') {
      schemaPublishCount.inc({
        model: 'modern',
        projectType: project.type,
        conclusion,
      });
    }

    let github: null | {
      repository: `${string}/${string}`;
      sha: string;
    } = null;

    if (input.gitHub != null) {
      if (!isGitHubRepositoryString(input.gitHub.repository)) {
        this.logger.debug(
          'Invalid github repository name provided (repository=%s)',
          input.gitHub.repository,
        );
        increaseSchemaPublishCountMetric('rejected');
        return {
          __typename: 'GitHubSchemaPublishError' as const,
          message: 'Invalid github repository name provided.',
        } as const;
      }

      github = {
        repository: input.gitHub.repository,
        sha: input.gitHub.commit,
      };
    } else if (input.github === true) {
      if (!project.gitRepository) {
        this.logger.debug(
          'Git repository is not configured for this project (project=%s)',
          project.id,
        );
        increaseSchemaPublishCountMetric('rejected');
        return {
          __typename: 'GitHubSchemaPublishError',
          message: 'Git repository is not configured for this project.',
        } as const;
      }
      github = {
        repository: project.gitRepository,
        sha: input.commit,
      };
    }

    let githubCheckRun: GitHubCheckRun | null = null;

    if (github) {
      const result = await this.createGithubCheckRunForSchemaPublish({
        organizationId: organization.id,
        github: {
          owner: github.repository.split('/')[0],
          repository: github.repository.split('/')[1],
          sha: github.sha,
        },
      });

      if (result.success === false) {
        increaseSchemaPublishCountMetric('rejected');
        return {
          __typename: 'GitHubSchemaPublishError',
          message: result.error,
        } as const;
      }

      githubCheckRun = result.data;
    }

    await this.schemaManager.completeGetStartedCheck({
      organizationId: project.orgId,
      step: 'publishingSchema',
    });

    this.logger.debug(`Found ${latestVersion?.schemas.length ?? 0} most recent schemas`);

    const conditionalBreakingChangeConfiguration =
      await this.getConditionalBreakingChangeConfiguration({
        selector: {
          organizationId: organization.id,
          projectId: project.id,
          targetId: target.id,
        },
      });

    const contracts =
      project.type === ProjectType.FEDERATION
        ? await this.contracts.loadActiveContractsWithLatestValidContractVersionsByTargetId({
            targetId: target.id,
          })
        : null;

    const compareToPreviousComposableVersion = shouldUseLatestComposableVersion(
      target.id,
      project,
      organization,
    );
    const comparedSchemaVersion = compareToPreviousComposableVersion
      ? latestComposableSchemaVersion
      : latestSchemaVersion;

    const latestSchemaVersionContracts = latestSchemaVersion
      ? await this.contracts.getContractVersionsForSchemaVersion({
          schemaVersionId: latestSchemaVersion.id,
        })
      : null;

    let publishResult: SchemaPublishResult;

    switch (project.type) {
      case ProjectType.SINGLE:
        this.logger.debug(
          'Using SINGLE registry model (featureFlags=%o)',
          organization.featureFlags,
        );
        publishResult = await this.models[ProjectType.SINGLE].publish({
          input,
          latest: latestVersion
            ? {
                isComposable: latestVersion.valid,
                sdl: latestSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: [ensureSingleSchema(latestVersion.schemas)],
              }
            : null,
          latestComposable: latestComposable
            ? {
                isComposable: latestComposable.valid,
                sdl: latestComposableSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: [ensureSingleSchema(latestComposable.schemas)],
              }
            : null,
          organization,
          project,
          target,
          baseSchema,
          conditionalBreakingChangeDiffConfig:
            conditionalBreakingChangeConfiguration?.conditionalBreakingChangeDiffConfig ?? null,
        });
        break;
      case ProjectType.FEDERATION:
      case ProjectType.STITCHING:
        this.logger.debug(
          'Using %s registry model (featureFlags=%o)',
          project.type,
          organization.featureFlags,
        );
        publishResult = await this.models[project.type].publish({
          input,
          latest: latestVersion
            ? {
                isComposable: latestVersion.valid,
                sdl: latestSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: ensureCompositeSchemas(latestVersion.schemas),
                contractNames:
                  latestSchemaVersionContracts?.edges.map(edge => edge.node.contractName) ?? null,
              }
            : null,
          latestComposable: latestComposable
            ? {
                isComposable: latestComposable.valid,
                sdl: latestComposableSchemaVersion?.compositeSchemaSDL ?? null,
                schemas: ensureCompositeSchemas(latestComposable.schemas),
              }
            : null,
          organization,
          project,
          target,
          baseSchema,
          contracts,
          conditionalBreakingChangeDiffConfig:
            conditionalBreakingChangeConfiguration?.conditionalBreakingChangeDiffConfig ?? null,
        });
        break;
      default: {
        this.logger.debug('Unsupported project type (type=%s)', project.type);
        throw new HiveError(`${project.type} project not supported`);
      }
    }

    if (publishResult.conclusion === SchemaPublishConclusion.Ignore) {
      this.logger.debug('Publish ignored (reasons=%s)', publishResult.reason);

      increaseSchemaPublishCountMetric('ignored');

      const linkToWebsite =
        typeof this.schemaModuleConfig.schemaPublishLink === 'function'
          ? this.schemaModuleConfig.schemaPublishLink({
              organization: {
                slug: organization.slug,
              },
              project: {
                slug: project.slug,
              },
              target: {
                slug: target.slug,
              },
              version: latestVersion ? { id: latestVersion.versionId } : undefined,
            })
          : null;

      if (githubCheckRun) {
        return this.updateGithubCheckRunForSchemaPublish({
          githubCheckRun,
          force: false,
          initial: false,
          valid: true,
          changes: [],
          errors: [],

          organizationId: organization.id,
          detailsUrl: linkToWebsite,
        });
      }

      return {
        __typename: 'SchemaPublishSuccess',
        initial: false,
        valid: true,
        changes: [],
        linkToWebsite,
      } as const;
    }

    if (publishResult.conclusion === SchemaPublishConclusion.Reject) {
      this.logger.debug(
        'Publish rejected (reasons=%s)',
        publishResult.reasons.map(r => r.code).join(', '),
      );

      increaseSchemaPublishCountMetric('rejected');

      if (getReasonByCode(publishResult.reasons, PublishFailureReasonCode.MissingServiceName)) {
        return {
          __typename: 'SchemaPublishMissingServiceError' as const,
          message: 'Missing service name',
        } as const;
      }

      if (getReasonByCode(publishResult.reasons, PublishFailureReasonCode.MissingServiceUrl)) {
        return {
          __typename: 'SchemaPublishMissingUrlError' as const,
          message: 'Missing service url',
        } as const;
      }

      const changes =
        getReasonByCode(publishResult.reasons, PublishFailureReasonCode.BreakingChanges)?.changes ??
        [];
      const errors = (
        [] as Array<{
          message: string;
        }>
      ).concat(
        getReasonByCode(publishResult.reasons, PublishFailureReasonCode.BreakingChanges)?.changes ??
          [],
        getReasonByCode(publishResult.reasons, PublishFailureReasonCode.CompositionFailure)
          ?.compositionErrors ?? [],
        getReasonByCode(publishResult.reasons, PublishFailureReasonCode.MetadataParsingFailure)
          ? [
              {
                message: 'Failed to parse metadata',
              },
            ]
          : [],
      );

      if (githubCheckRun) {
        return this.updateGithubCheckRunForSchemaPublish({
          githubCheckRun,
          force: false,
          initial: false,
          valid: false,
          changes,
          errors,
          organizationId: organization.id,
          detailsUrl: null,
        });
      }

      return {
        __typename: 'SchemaPublishError' as const,
        valid: false,
        changes,
        errors,
      };
    }

    const errors = (
      [] as Array<{
        message: string;
      }>
    ).concat(
      publishResult.state.compositionErrors ?? [],
      publishResult.state.breakingChanges ?? [],
    );

    this.logger.debug('Publishing new version');

    const composable = publishResult.state.composable;
    const fullSchemaSdl = publishResult.state.fullSchemaSdl;
    const publishState = publishResult.state;

    if (composable && !fullSchemaSdl) {
      throw new Error('Version is composable but the full schema SDL is missing');
    }

    increaseSchemaPublishCountMetric('accepted');

    const changes = publishResult.state.changes ?? [];
    const messages = publishResult.state.messages ?? [];
    const initial = publishResult.state.initial;
    const pushedSchema = publishResult.state.schema;
    const schemas = [...publishResult.state.schemas];
    const schemaLogIds = schemas
      .filter(s => s.id !== pushedSchema.id) // do not include the incoming schema
      .map(s => s.id);

    const supergraph = publishResult.state.supergraph ?? null;

    const diffSchemaVersionId = comparedSchemaVersion?.id ?? null;

    this.logger.debug(`Assigning ${schemaLogIds.length} schemas to new version`);

    const schemaVersion = await this.schemaManager.createVersion({
      valid: composable,
      organizationId: organizationId,
      projectId: project.id,
      targetId: target.id,
      commit: input.commit,
      logIds: schemaLogIds,
      service: input.service,
      schema: input.sdl,
      author: input.author,
      url: input.url,
      base_schema: baseSchema,
      metadata: input.metadata ?? null,
      projectType: project.type,
      github,
      actionFn: async () => {
        if (composable && fullSchemaSdl) {
          const contracts: Array<{ name: string; sdl: string; supergraph: string }> = [];
          for (const contract of publishState.contracts ?? []) {
            if (contract.fullSchemaSdl && contract.supergraph) {
              contracts.push({
                name: contract.contractName,
                sdl: contract.fullSchemaSdl,
                supergraph: contract.supergraph,
              });
            }
          }

          await this.publishToCDN({
            target,
            project,
            supergraph,
            fullSchemaSdl,
            schemas,
            contracts,
          });
        }
      },
      changes,
      coordinatesDiff: publishResult.state.coordinatesDiff,
      diffSchemaVersionId,
      previousSchemaVersion: latestVersion?.versionId ?? null,
      conditionalBreakingChangeMetadata: await this.getConditionalBreakingChangeMetadata({
        conditionalBreakingChangeConfiguration,
        organizationId,
        projectId,
        targetId,
      }),
      contracts:
        publishResult.state.contracts?.map(contract => ({
          contractId: contract.contractId,
          contractName: contract.contractName,
          compositeSchemaSDL: contract.fullSchemaSdl,
          supergraphSDL: contract.supergraph,
          schemaCompositionErrors: contract.compositionErrors,
          changes: contract.changes,
        })) ?? null,
      ...(fullSchemaSdl
        ? {
            compositeSchemaSDL: fullSchemaSdl,
            supergraphSDL: supergraph,
            schemaCompositionErrors: null,
            tags: publishResult.state?.tags ?? null,
            schemaMetadata: publishResult.state?.schemaMetadata ?? null,
            metadataAttributes: publishResult.state?.metadataAttributes ?? null,
          }
        : {
            compositeSchemaSDL: null,
            supergraphSDL: null,
            schemaCompositionErrors: assertNonNull(
              publishResult.state.compositionErrors,
              "Can't be null",
            ),
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          }),
    });

    if (changes.length > 0 || errors.length > 0) {
      void this.alertsManager
        .triggerSchemaChangeNotifications({
          organization,
          project,
          target,
          schema: {
            id: schemaVersion.id,
            commit: schemaVersion.actionId,
            valid: schemaVersion.isComposable,
          },
          changes,
          messages,
          errors,
          initial,
        })
        .catch(err => {
          this.logger.error('Failed to trigger schema change notifications', err);
        });
    }

    const linkToWebsite =
      typeof this.schemaModuleConfig.schemaPublishLink === 'function'
        ? this.schemaModuleConfig.schemaPublishLink({
            organization: {
              slug: organization.slug,
            },
            project: {
              slug: project.slug,
            },
            target: {
              slug: target.slug,
            },
            version: latestVersion
              ? {
                  id: schemaVersion.id,
                }
              : undefined,
          })
        : null;

    if (githubCheckRun) {
      return this.updateGithubCheckRunForSchemaPublish({
        githubCheckRun,
        force: false,
        initial: publishResult.state.initial,
        valid: publishResult.state.composable,
        changes: publishResult.state.changes ?? [],
        errors,
        messages: publishResult.state.messages ?? [],
        organizationId: organization.id,
        detailsUrl: linkToWebsite,
      });
    }

    return {
      __typename: 'SchemaPublishSuccess' as const,
      initial: publishResult.state.initial,
      valid: publishResult.state.composable,
      changes: null,
      message: (publishResult.state.messages ?? []).join('\n'),
      linkToWebsite,
    };
  }

  /**
   * Returns `null` in case the check-run could not be created, which most likely indicates
   * missing permission for the GitHub App to access the GitHub repository.
   */
  private async createGithubCheckRunStartForSchemaCheck(args: {
    project: {
      orgId: string;
      slug: string;
      name: string;
      useProjectNameInGithubCheck: boolean;
    };
    target: Target;
    organization: Organization;
    serviceName: string | null;
    github: {
      owner: string;
      repository: string;
      sha: string;
    };
  }) {
    return await this.gitHubIntegrationManager.createCheckRun({
      name: buildGitHubActionCheckName({
        projectName: args.project.name,
        targetName: args.target.name,
        serviceName: args.serviceName,
        includeProjectName: args.project.useProjectNameInGithubCheck,
      }),
      sha: args.github.sha,
      organizationId: args.project.orgId,
      repositoryOwner: args.github.owner,
      repositoryName: args.github.repository,
      output: {
        title: 'Started schema check',
        summary: 'The schema check is on progress. Please wait until the result is reported.',
      },
      detailsUrl: null,
    });
  }

  private async updateGithubCheckRunForSchemaCheck({
    conclusion,
    changes,
    breakingChanges,
    compositionErrors,
    errors,
    warnings,
    schemaCheckId,
    ...args
  }: {
    organization: Organization;
    project: {
      orgId: string;
      slug: string;
      name: string;
      useProjectNameInGithubCheck: boolean;
    };
    target: Target;
    githubCheckRun: {
      owner: string;
      repository: string;
      id: number;
    };
    conclusion: SchemaCheckConclusion;
    warnings: SchemaCheckWarning[] | null;
    changes: Array<SchemaChangeType> | null;
    breakingChanges: Array<SchemaChangeType> | null;
    compositionErrors: Array<{
      message: string;
    }> | null;
    errors: Array<{
      message: string;
    }> | null;
    schemaCheckId: string | null;
    failedContractCompositionCount: number;
  }) {
    try {
      let title: string;
      let summary: string;
      let shortSummaryFallback: string;

      if (conclusion === SchemaCheckConclusion.Success) {
        if (!changes || changes.length === 0) {
          title = 'No changes';
          summary = 'No changes detected';
          shortSummaryFallback = summary;
        } else {
          title = 'No breaking changes';
          summary = this.changesToMarkdown(changes);
          shortSummaryFallback = this.changesToMarkdown(changes, false);
        }
      } else {
        const total =
          (compositionErrors?.length ?? 0) + (breakingChanges?.length ?? 0) + (errors?.length ?? 0);

        title = `Detected ${total} error${total === 1 ? '' : 's'}`;
        summary = [
          errors ? this.errorsToMarkdown(errors) : null,
          args.failedContractCompositionCount > 0
            ? `- ${args.failedContractCompositionCount} contract check(s) failed. (Click view more details on GraphQL Hive button below)`
            : null,
          warnings ? this.warningsToMarkdown(warnings) : null,
          compositionErrors ? this.errorsToMarkdown(compositionErrors) : null,
          breakingChanges ? this.errorsToMarkdown(breakingChanges) : null,
          changes ? this.changesToMarkdown(changes) : null,
        ]
          .filter(Boolean)
          .join('\n\n');

        shortSummaryFallback = [
          errors?.length ? `Errors: ${errors.length}` : null,
          warnings?.length ? `Warnings: ${warnings.length}` : null,
          compositionErrors?.length ? `Composition errors: ${compositionErrors.length}` : null,
          breakingChanges?.length ? `Breaking changes: ${breakingChanges.length}` : null,
          changes?.length ? `Changes: ${changes.length}` : null,
          args.failedContractCompositionCount > 0
            ? `Contract check failures: ${args.failedContractCompositionCount}`
            : null,
        ]
          .filter(Boolean)
          .join('\n\n');
      }

      const checkRun = await this.gitHubIntegrationManager.updateCheckRun({
        organizationId: args.project.orgId,
        conclusion: conclusion === SchemaCheckConclusion.Success ? 'success' : 'failure',
        githubCheckRun: args.githubCheckRun,
        output: {
          title,
          summary,
          shortSummaryFallback,
        },
        detailsUrl:
          (schemaCheckId &&
            this.schemaModuleConfig.schemaCheckLink?.({
              project: args.project,
              target: args.target,
              organization: args.organization,
              schemaCheckId,
            })) ||
          null,
      });

      return {
        __typename: 'GitHubSchemaCheckSuccess' as const,
        message: 'Check-run created',
        checkRun,
      };
    } catch (error: any) {
      Sentry.captureException(error);
      return {
        __typename: 'GitHubSchemaCheckError' as const,
        message: `Failed to create the check-run`,
      };
    }
  }

  @traceFn('SchemaPublisher.publishToCDN')
  private async publishToCDN({
    target,
    project,
    supergraph,
    fullSchemaSdl,
    schemas,
    contracts,
  }: {
    target: Target;
    project: Project;
    supergraph: string | null;
    fullSchemaSdl: string;
    schemas: readonly Schema[];
    contracts: null | Array<{ name: string; supergraph: string; sdl: string }>;
  }) {
    const publishMetadata = async () => {
      const metadata: Array<Record<string, any>> = [];
      for (const schema of schemas) {
        if (typeof schema.metadata === 'string') {
          metadata.push(JSON.parse(schema.metadata));
        }
      }

      if (metadata.length > 0) {
        await this.artifactStorageWriter.writeArtifact({
          targetId: target.id,
          // SINGLE project can have only one metadata, we need to pass it as an object,
          // COMPOSITE projects can have multiple metadata, we need to pass it as an array
          artifact: project.type === ProjectType.SINGLE ? metadata[0] : metadata,
          artifactType: 'metadata',
          contractName: null,
        });
      }
    };

    const publishCompositeSchema = async () => {
      const compositeSchema = ensureCompositeSchemas(schemas);

      await Promise.all([
        await this.artifactStorageWriter.writeArtifact({
          targetId: target.id,
          artifactType: 'services',
          artifact: compositeSchema.map(s => ({
            name: s.service_name,
            sdl: s.sdl,
            url: s.service_url,
          })),
          contractName: null,
        }),
        this.artifactStorageWriter.writeArtifact({
          targetId: target.id,
          artifactType: 'sdl',
          artifact: fullSchemaSdl,
          contractName: null,
        }),
      ]);
    };

    const publishSingleSchema = async () => {
      await this.artifactStorageWriter.writeArtifact({
        targetId: target.id,
        artifactType: 'sdl',
        artifact: fullSchemaSdl,
        contractName: null,
      });
    };

    const actions = [
      project.type === ProjectType.SINGLE ? publishSingleSchema() : publishCompositeSchema(),
      publishMetadata(),
    ];

    if (project.type === ProjectType.FEDERATION) {
      if (supergraph) {
        this.logger.debug('Publishing supergraph to CDN');

        actions.push(
          this.artifactStorageWriter.writeArtifact({
            targetId: target.id,
            artifactType: 'supergraph',
            artifact: supergraph,
            contractName: null,
          }),
        );
      }
      if (contracts) {
        this.logger.debug('Publishing contracts to CDN');

        for (const contract of contracts) {
          this.logger.debug('Publishing contract to CDN (contractName=%s)', contract.name);
          actions.push(
            this.artifactStorageWriter.writeArtifact({
              targetId: target.id,
              artifactType: 'sdl',
              artifact: contract.sdl,
              contractName: contract.name,
            }),
            this.artifactStorageWriter.writeArtifact({
              targetId: target.id,
              artifactType: 'supergraph',
              artifact: contract.supergraph,
              contractName: contract.name,
            }),
          );
        }
      }
    }

    await Promise.all(actions);
  }

  private async createGithubCheckRunForSchemaPublish(args: {
    organizationId: string;
    github: {
      owner: string;
      repository: string;
      sha: string;
    };
  }) {
    return await this.gitHubIntegrationManager.createCheckRun({
      name: 'GraphQL Hive - schema:publish',
      sha: args.github.sha,
      organizationId: args.organizationId,
      repositoryOwner: args.github.owner,
      repositoryName: args.github.repository,
      output: {
        title: 'Started schema check',
        summary: 'The schema check is on progress. Please wait until the result is reported.',
      },
      detailsUrl: null,
    });
  }

  private async updateGithubCheckRunForSchemaPublish({
    initial,
    force,
    valid,
    changes,
    errors,
    messages,
    organizationId,
    githubCheckRun,
    detailsUrl,
  }: {
    organizationId: string;
    githubCheckRun: {
      owner: string;
      repository: string;
      id: number;
    };
    initial: boolean;
    force?: boolean | null;
    valid: boolean;
    changes: Array<SchemaChangeType>;
    errors: readonly Types.SchemaError[];
    messages?: string[];
    detailsUrl: string | null;
  }) {
    try {
      let title: string;
      let summary: string;
      let shortSummaryFallback: string;

      if (valid) {
        if (initial) {
          title = 'Schema published';
          summary = 'Initial Schema published';
          shortSummaryFallback = summary;
        } else if (changes.length === 0) {
          title = 'No changes';
          summary = 'No changes detected';
          shortSummaryFallback = summary;
        } else {
          title = 'No breaking changes';
          summary = this.changesToMarkdown(changes);
          shortSummaryFallback = this.changesToMarkdown(changes, false);
        }
      } else {
        title = `Detected ${errors.length} error${errors.length === 1 ? '' : 's'}`;
        summary = [
          errors ? this.errorsToMarkdown(errors) : null,
          changes ? this.changesToMarkdown(changes) : null,
        ]
          .filter(Boolean)
          .join('\n\n');

        shortSummaryFallback = [
          errors ? `Errors: ${errors.length}` : null,
          changes ? `Changes: ${changes.length}` : null,
        ]
          .filter(Boolean)
          .join('\n\n');
      }

      if (messages?.length) {
        summary += `\n\n${messages.map(val => `- ${val}`).join('\n')}`;
        shortSummaryFallback += `\n\n${messages.map(val => `- ${val}`).join('\n')}`;
      }

      if (valid === false && force === true) {
        title += ' (forced)';
      }

      await this.gitHubIntegrationManager.updateCheckRun({
        githubCheckRun,
        conclusion: valid ? 'success' : force ? 'neutral' : 'failure',
        organizationId,
        output: {
          title,
          summary,
          shortSummaryFallback,
        },
        detailsUrl,
      });
      return {
        __typename: 'GitHubSchemaPublishSuccess',
        message: title,
      } as const;
    } catch (error: unknown) {
      Sentry.captureException(error);
      return {
        __typename: 'GitHubSchemaPublishError',
        message: `Failed to create the check-run`,
      } as const;
    }
  }

  private errorsToMarkdown(errors: ReadonlyArray<{ message: string }>): string {
    return ['', ...errors.map(error => `- ${bolderize(error.message)}`)].join('\n');
  }

  private warningsToMarkdown(warnings: SchemaCheckWarning[]): string {
    return [
      '',
      ...warnings.map(warning => {
        const details = [warning.source ? `source: ${warning.source}` : undefined]
          .filter(Boolean)
          .join(', ');

        return `- ${bolderize(warning.message)}${details ? ` (${details})` : ''}`;
      }),
    ].join('\n');
  }

  private changesToMarkdown(
    changes: ReadonlyArray<SchemaChangeType>,
    printListOfChanges: boolean = true,
  ): string {
    const breakingChanges = changes.filter(
      change => change.criticality === CriticalityLevel.Breaking,
    );
    const safeChanges = changes.filter(change => change.criticality !== CriticalityLevel.Breaking);

    const lines: string[] = [
      `## Found ${changes.length} change${changes.length > 1 ? 's' : ''}`,
      '',
    ];

    if (breakingChanges.length) {
      lines.push(`Breaking: ${breakingChanges.length}`);
    }

    if (safeChanges.length) {
      lines.push(`Safe: ${safeChanges.length}`);
    }

    if (printListOfChanges) {
      writeChanges('Breaking', breakingChanges, lines);
      writeChanges('Safe', safeChanges, lines);
    }

    return lines.join('\n');
  }
}

function writeChanges(
  type: string,
  changes: ReadonlyArray<{ message: string }>,
  lines: string[],
): void {
  if (changes.length > 0) {
    lines.push(
      ...['', `### ${type} changes`].concat(
        changes.map(change => ` - ${bolderize(change.message)}`),
      ),
    );
  }
}

function buildGitHubActionCheckName(input: {
  targetName: string;
  projectName: string;
  serviceName: string | null;
  includeProjectName: boolean;
}) {
  const path = [
    input.includeProjectName ? input.projectName : null,
    input.targetName,
    input.serviceName,
  ].filter((val): val is string => typeof val === 'string');

  return `GraphQL Hive > schema:check > ${path.join(' > ')}`;
}

function tryPrettifySDL(sdl: string): string {
  try {
    return print(parse(sdl));
  } catch {
    return sdl;
  }
}

const millisecondsPerDay = 60 * 60 * 24 * 1000;

const SchemaCheckContextIdModel = z
  .string()
  .min(1, {
    message: 'Context ID must be at least 1 character long.',
  })
  .max(200, {
    message: 'Context ID cannot exceed length of 200 characters.',
  });
