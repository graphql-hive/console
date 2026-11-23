import { URL } from 'node:url';
import { Injectable, Scope } from 'graphql-modules';
import hashObject from 'object-hash';
import { ChangeType, CriticalityLevel, TypeOfChangeType } from '@graphql-inspector/core';
import type { DangerousChangeType } from '@hive/api/__generated__/types';
import type { CheckPolicyResponse } from '@hive/policy';
import type { CompositionFailureError, ContractsInputType } from '@hive/schema';
import { invariant, traceFn } from '@hive/service-common';
import {
  HiveSchemaChangeModel,
  type RegistryServiceUrlChangeSerializableChange,
  type SchemaChangeType,
} from '@hive/storage';
import { ProjectType, toCompositionSchemaInput } from '../../../shared/entities';
import { AffectAppDeploymentsBySchemaCoordinate } from '../../app-deployments/providers/app-deployments';
import { OperationsReader } from '../../operations/providers/operations-reader';
import { SchemaPolicyProvider } from '../../policy/providers/schema-policy.provider';
import { isSchemaChangeUsageTracked } from '../lib/schema-change-usage-tracking';
import type {
  ComposeAndValidateResult,
  DateRange,
  Organization,
  Project,
} from './../../../shared/entities';
import { Logger } from './../../shared/providers/logger';
import { SchemaCheckWarning } from './models/shared';
import { CompositionOrchestrator } from './orchestrator/composition-orchestrator';
import { SchemaDiffScheduler } from './schema-diff-scheduler';
import { CompositeSchemaInput, extendWithBase, SchemaHelper, SchemaInput } from './schema-helper';

export type ConditionalBreakingChangeDiffConfig = {
  period: DateRange;
  requestCountThreshold: number;
  targetIds: string[];
  excludedClientNames: string[] | null;
  excludedAppDeploymentNames: string[] | null;
};

export type AffectedAppDeployment = {
  appDeployment: {
    id: string;
    name: string;
    version: string;
    createdAt: string | null;
    activatedAt: string | null;
    retiredAt: string | null;
  };
  affectedOperationsByCoordinate: Record<string, Array<{ hash: string; name: string | null }>>;
  countByCoordinate: Record<string, number>;
  totalOperationsByCoordinate: number;
};

export type AffectedAppDeploymentsResult = {
  deployments: AffectedAppDeployment[];
  totalDeployments: number;
};

export type GetAffectedAppDeployments = (
  schemaCoordinates: string[],
) => Promise<AffectAppDeploymentsBySchemaCoordinate>;

// The reason why I'm using `result` and `reason` instead of just `data` for both:
// https://bit.ly/hive-check-result-data
export type CheckResult<C = unknown, F = unknown, S = unknown> =
  | {
      status: 'completed';
      result: C;
    }
  | {
      status: 'failed';
      reason: F;
    }
  | {
      status: 'skipped';
      data?: S;
    };

type CompositionValidationError = {
  message: string;
  source: 'composition';
};

type CompositionGraphQLValidationError = {
  message: string;
  source: 'graphql';
};

function isCompositionValidationError(
  error: CompositionFailureError,
): error is CompositionValidationError {
  return error.source === 'composition';
}

function isGraphQLValidationError(
  error: CompositionFailureError,
): error is CompositionGraphQLValidationError {
  return !isCompositionValidationError(error);
}

function mapContract(contract: Exclude<ComposeAndValidateResult['contracts'], null>[number]) {
  if (Array.isArray(contract.errors) && contract.errors.length) {
    return {
      status: 'failed',
      reason: {
        errors: contract.errors,
        errorsBySource: {
          graphql: contract.errors.filter(isGraphQLValidationError),
          composition: contract.errors.filter(isCompositionValidationError),
        },
        // Federation 1 apparently has SDL and validation errors at the same time.
        fullSchemaSdl: contract.sdl,
      },
    } satisfies ContractCompositionFailure;
  }

  if (!contract.sdl) {
    throw new Error('No SDL, but no errors either');
  }

  return {
    status: 'completed',
    result: {
      fullSchemaSdl: contract.sdl,
      supergraph: contract.supergraph,
    },
  } satisfies ContractCompositionSuccess;
}

type ContractCompositionFailure = {
  status: 'failed';
  reason: {
    errors: CompositionFailureError[];
    errorsBySource: {
      graphql: CompositionGraphQLValidationError[];
      composition: CompositionValidationError[];
    };
    // Federation 1 apparently has SDL and validation errors at the same time.
    fullSchemaSdl: string | null;
  };
  result?: never;
};

export type ContractCompositionSuccess = {
  status: 'completed';
  result: {
    fullSchemaSdl: string;
    supergraph: string | null;
  };
  reason?: never;
};

export type ContractCompositionResult = ContractCompositionFailure | ContractCompositionSuccess;

type SchemaDiffFailure = {
  status: 'failed';
  reason: {
    breaking: Array<SchemaChangeType> | null;
    safe: Array<SchemaChangeType> | null;
    all: Array<SchemaChangeType> | null;
  };
  result?: never;
};

export type SchemaDiffSuccess = {
  status: 'completed';
  result: {
    breaking: Array<SchemaChangeType> | null;
    safe: Array<SchemaChangeType> | null;
    all: Array<SchemaChangeType> | null;
  };
  reason?: never;
};

export type SchemaDiffSkip = {
  status: 'skipped';
  result?: never;
  reason?: never;
};

export type SchemaDiffResult = SchemaDiffFailure | SchemaDiffSuccess | SchemaDiffSkip;

@Injectable({
  scope: Scope.Operation,
})
export class RegistryChecks {
  constructor(
    private helper: SchemaHelper,
    private policy: SchemaPolicyProvider,
    private schemaDiffScheduler: SchemaDiffScheduler,
    private logger: Logger,
    private operationsReader: OperationsReader,
    private orchestrator: CompositionOrchestrator,
  ) {}

  /**
   * Compare the incoming schema with the existing schema.
   * In case of a Federated schema, it's a subgraph.
   * Comparing the whole collection of subgraphs makes no sense,
   * as the only element that is different is the subgraph that is updated.
   * The rest of the subgraphs are inherited from the previous version, meaning they are the same.
   */
  checksum(args: {
    incoming: {
      schema: SchemaInput;
      contractNames: null | Array<string>;
    };
    existing: null | {
      schema: SchemaInput;
      contractNames: null | Array<string>;
    };
  }) {
    this.logger.debug(
      'Checksum check (existingSchema=%s, existingContractCount=%s, incomingContractCount=%s)',
      args.existing?.schema ? 'yes' : 'no',
      args.existing?.contractNames?.length ?? null,
      args.incoming.contractNames?.length ?? null,
    );

    if (!args.existing) {
      this.logger.debug('No existing version');
      return 'initial' as const;
    }

    const isSchemasModified =
      this.helper.createChecksum(args.existing.schema) !==
      this.helper.createChecksum(args.incoming.schema);

    if (isSchemasModified) {
      this.logger.debug('Schema is modified.');
      return 'modified' as const;
    }

    const existingContractNames = args.existing.contractNames;
    const incomingContractNames = args.incoming.contractNames;

    if (existingContractNames === null && incomingContractNames === null) {
      this.logger.debug('No contracts.');
      return 'unchanged' as const;
    }

    if (
      existingContractNames?.length &&
      incomingContractNames?.length &&
      existingContractNames.length === incomingContractNames.length
    ) {
      const sortedExistingContractNames = existingContractNames.slice().sort(compareAlphaNumeric);
      const sortedIncomingContractNames = incomingContractNames.slice().sort(compareAlphaNumeric);

      if (
        sortedExistingContractNames.every(
          (name, index) => name === sortedIncomingContractNames[index],
        )
      ) {
        this.logger.debug('Contracts have not changed.');
        return 'unchanged' as const;
      }
    }

    this.logger.debug('Contracts have changed.');

    return 'modified' as const;
  }

  /**
   * Throws GraphQLDocumentStringInvalidError in case the SDL is not valid.
   * The composition does not parse SDLs on our side, so this must be called for SDL provided by the user,
   * before composing it.
   */
  assertValidSDL(sdl: string): void {
    this.helper.createSchemaObject({ sdl });
  }

  async composition({
    targetId,
    project,
    organization,
    schemas,
    baseSchema,
    contracts,
  }: {
    targetId: string;
    project: Project;
    organization: Organization;
    schemas: Array<SchemaInput>;
    baseSchema: string | null;
    contracts: null | ContractsInputType;
  }) {
    const result = await this.orchestrator.composeAndValidate(
      CompositionOrchestrator.projectTypeToOrchestratorType(project.type),
      // The composition only needs the raw SDLs, parsing them here would be wasted work.
      extendWithBase(schemas, baseSchema).map(s => toCompositionSchemaInput(s)),
      {
        external: project.externalComposition,
        native: this.checkProjectNativeFederationSupport(targetId, project, organization),
        contracts,
      },
    );

    if (Array.isArray(result.errors) && result.errors.length) {
      this.logger.debug('Detected composition/validation errors');

      return {
        status: 'failed',
        reason: {
          errors: result.errors,
          errorsBySource: {
            graphql: result.errors.filter(isGraphQLValidationError),
            composition: result.errors.filter(isCompositionValidationError),
          },
          // Federation 1 apparently has SDL and validation errors at the same time.
          fullSchemaSdl: result.sdl,
          contracts: result.contracts?.map(mapContract) ?? null,
          includesNetworkError: result.includesNetworkError ?? false,
          includesException: result.includesException ?? false,
        },
      } satisfies CheckResult;
    }

    invariant(result.sdl, 'No SDL, but no errors either');

    return {
      status: 'completed',
      result: {
        fullSchemaSdl: result.sdl,
        supergraph: result.supergraph,
        tags: result.tags ?? null,
        contracts: result.contracts?.map(mapContract) ?? null,
        schemaMetadata: result.schemaMetadata ?? null,
        metadataAttributes: result.metadataAttributes ?? null,
      },
    } satisfies CheckResult;
  }

  /**
   * Retrieve the SDL of the previous schema version.
   * Either by using pre-computed sdl or composing on the fly.
   */
  async retrievePreviousVersionSdl(args: {
    version: {
      isComposable: boolean;
      sdl: string | null;
      schemas: Array<SchemaInput>;
    } | null;
    organization: Organization;
    project: Project;
    targetId: string;
  }): Promise<string | null> {
    this.logger.debug('Retrieve previous version SDL.');
    if (!args.version) {
      this.logger.debug('No previous version available, skip.');
      return null;
    }

    if (args.version.sdl) {
      this.logger.debug('Return pre-computed SDL.');
      return args.version.sdl;
    }

    if (args.version.isComposable === false) {
      this.logger.debug('Skip composition due to non-composable version.');
      return null;
    }

    this.logger.debug('Compose on the fly.');

    const existingSchemaResult = await this.orchestrator.composeAndValidate(
      CompositionOrchestrator.projectTypeToOrchestratorType(args.project.type),
      args.version.schemas.map(s => toCompositionSchemaInput(s)),
      {
        external: args.project.externalComposition,
        native: this.checkProjectNativeFederationSupport(
          args.targetId,
          args.project,
          args.organization,
        ),
        contracts: null,
      },
    );

    return existingSchemaResult.sdl ?? null;
  }

  @traceFn('RegistryChecks.policyCheck')
  async policyCheck({
    selector,
    modifiedSdl,
    incomingSdl,
  }: {
    modifiedSdl: string;
    incomingSdl: string | null;
    selector: {
      organizationId: string;
      projectId: string;
      targetId: string;
    };
  }) {
    if (incomingSdl == null) {
      this.logger.debug('Skip policy check due to no SDL being composed.');
      return {
        status: 'skipped',
      } satisfies CheckResult;
    }

    const policyResult = await this.policy.checkPolicy(incomingSdl, modifiedSdl, selector);
    const warnings = policyResult?.warnings?.map<SchemaCheckWarning>(toSchemaCheckWarning) ?? null;

    if (policyResult === null) {
      return {
        status: 'skipped',
      } satisfies CheckResult;
    }

    if (policyResult.success) {
      return {
        status: 'completed',
        result: {
          warnings,
          errors: null,
        },
      } satisfies CheckResult;
    }

    return {
      status: 'failed',
      reason: {
        errors: policyResult.errors.map(toSchemaCheckWarning),
        warnings,
      },
    } satisfies CheckResult;
  }

  @traceFn('RegistryChecks.serviceDiff')
  /**
   * Intended to be used for subgraph/service schemas only. This does not check conditional breaking changes
   * or policy logic. This function strictly calculates the diff between two SDL and returns the list of changes.
   * This also handles raw SDL which might include type extensions -- which cannot be used by themselves to build
   * a schema and therefore must have the type definition added
   */
  async serviceDiff(args: {
    /** The existing SDL */
    existing: Pick<SchemaInput, 'sdl'> | null;
    /** The incoming SDL */
    incoming: Pick<SchemaInput, 'sdl'> | null;
  }) {
    if (!args.existing || !args.incoming) {
      this.logger.debug(
        'Skip serviceDiff check due to either existing or incoming SDL being absent.',
      );
      return {
        status: 'skipped',
      } satisfies CheckResult;
    }

    const outcome = await this.schemaDiffScheduler.diff({
      existingSdl: args.existing.sdl,
      incomingSdl: args.incoming.sdl,
      source: 'service',
      filterNestedChanges: false,
      filterOutFederationChanges: false,
    });

    if (outcome.status === 'skipped') {
      this.logger.error('Failed to build schema for serviceDiff. Skip serviceDiff check.');
      return {
        status: 'skipped',
      } satisfies CheckResult;
    }

    return {
      status: 'completed',
      result: outcome.changes,
    } satisfies CheckResult;
  }

  /**
   * Diff incoming and existing SDL and generate a list of changes.
   * Uses usage stats to determine whether a change is safe or not (if available).
   */
  @traceFn('RegistryChecks.diff')
  async diff(args: {
    /** The existing SDL */
    existingSdl: string | null;
    /** The incoming SDL */
    incomingSdl: string | null;
    includeUrlChanges:
      | false
      | {
          schemasBefore: CompositeSchemaInput[];
          schemasAfter: CompositeSchemaInput[];
        };
    /** Whether Federation directive related changes should be filtered out from the list of changes. These would only show up due to an internal bug. */
    filterOutFederationChanges: boolean;
    /** Lookup map of changes that are approved and thus safe. */
    approvedChanges: null | Map<string, SchemaChangeType>;
    /** Settings for fetching conditional breaking changes. */
    conditionalBreakingChangeConfig: null | ConditionalBreakingChangeDiffConfig;
    failDiffOnDangerousChange: boolean;
    failAllDangerousChanges: boolean;
    failDangerousChangeTypes: DangerousChangeType[];
    /**
     * Set to true to reduce the number of changes to only what's relevant to the user.
     * Use false for schema proposals in order to capture every single change record for the patch function.
     */
    filterNestedChanges: boolean;
    /** Function to fetch affected app deployments. Called with breaking change coordinates after diff is computed. */
    getAffectedAppDeployments: GetAffectedAppDeployments | null;
  }) {
    if (!args.existingSdl || !args.incomingSdl) {
      this.logger.debug('Skip diff check due to either existing or incoming SDL being absent.');
      return {
        status: 'skipped',
      } satisfies CheckResult;
    }

    const outcome = await this.schemaDiffScheduler.diff({
      existingSdl: args.existingSdl,
      incomingSdl: args.incomingSdl,
      source: 'composed',
      filterNestedChanges: args.filterNestedChanges,
      filterOutFederationChanges: args.filterOutFederationChanges,
    });

    if (outcome.status === 'skipped') {
      this.logger.error('Failed to build schema for diff. Skip diff check.');
      return {
        status: 'skipped',
      } satisfies CheckResult;
    }

    const inspectorChanges = outcome.changes;

    const isFailingDangerousChange = (change: { criticality: CriticalityLevel; type: string }) => {
      return (
        args.failDiffOnDangerousChange &&
        change.criticality === CriticalityLevel.Dangerous &&
        // if failAll is null or true, or if the list of failing change types includes this type...
        (args.failAllDangerousChanges === true ||
          (args.failDangerousChangeTypes as string[])?.includes(change.type))
      );
    };

    /**
     * Usage decides whether these changes fail the check: breaking changes always; a dangerous change
     * the target fails on only where usage is recorded for its coordinate, otherwise zero usage would
     * always pass it and silently void the setting.
     */
    const isSubjectToUsageCheck = (change: SchemaChangeType) =>
      change.criticality === CriticalityLevel.Breaking ||
      (isFailingDangerousChange(change) && isSchemaChangeUsageTracked(change));

    if (args.conditionalBreakingChangeConfig) {
      this.logger.debug('Conditional breaking change settings available.');
      const settings = args.conditionalBreakingChangeConfig;

      this.logger.debug('Fetching affected operations and affected clients for breaking changes.');

      await Promise.all(
        inspectorChanges.map(async change => {
          if (!isSubjectToUsageCheck(change) || !change.breakingChangeSchemaCoordinate) {
            return;
          }

          let checkCoordinate = change.breakingChangeSchemaCoordinate;
          if (isNullToRequiredArgumentChange(change)) {
            /**
             * It's necessary to check the parent field in this case because an argument is included in the
             * usage report's list of coordinates _only if it's in the operation_. E.g. For a schema:
             *
             * ```
             * type Query {
             *   foo(a: String): String
             * }
             * ```
             *
             * Operation `query Foo { foo(a: "b") }`
             * Reports: `Query.foo, Query.foo.a, Query.foo.a!`
             *
             * Operation: `query Foo2 { foo }`
             * Only reports: `Query.foo`.
             *
             * And so when changing an argument from nullable to non-nullable, we need to check the parent field
             * could rather than the argument count. Otherwise, the second example wouldn't trigger the change as "breaking".
             */
            checkCoordinate = change.breakingChangeSchemaCoordinate
              .split('.')
              .slice(0, 2)
              .join('.');
          }

          const totalRequestCounts = await this.operationsReader.countCoordinate({
            targetIds: settings.targetIds,
            excludedClients: settings.excludedClientNames,
            period: settings.period,
            schemaCoordinate: checkCoordinate,
          });
          const totalRequests = totalRequestCounts[checkCoordinate] ?? 0;
          let isBreaking = totalRequests >= Math.max(settings.requestCountThreshold, 1);
          const useAdvancedNullabilityCheck = requiresAdvancedNullabilityCheck(change);
          if (isBreaking && useAdvancedNullabilityCheck) {
            const advancedNullabilityTotalRequests = await this.operationsReader.countCoordinate({
              targetIds: settings.targetIds,
              excludedClients: settings.excludedClientNames,
              period: settings.period,
              schemaCoordinate: `${change.breakingChangeSchemaCoordinate}!`,
            });

            if (
              advancedNullabilityTotalRequests[`${change.breakingChangeSchemaCoordinate}!`] >=
              totalRequests
            ) {
              // All requests for this coordinate provide the value for the coordinate. So moving to non-null is allowed.
              isBreaking = false;
            }
          }

          if (isBreaking) {
            const read = {
              targetIds: settings.targetIds,
              excludedClients: settings.excludedClientNames,
              period: settings.period,
            };
            const [topAffectedClients, topAffectedOperations, targets] = await Promise.all([
              this.operationsReader.getTopClientsForSchemaCoordinate({
                targetIds: settings.targetIds,
                excludedClients: settings.excludedClientNames,
                period: settings.period,
                schemaCoordinate: change.breakingChangeSchemaCoordinate,
              }),
              this.operationsReader.getTopOperationsForSchemaCoordinate({
                targetIds: settings.targetIds,
                excludedClients: settings.excludedClientNames,
                period: settings.period,
                schemaCoordinate: change.breakingChangeSchemaCoordinate,
              }),
              this.countTargetUsage({
                read,
                coordinate: checkCoordinate,
                providedCoordinate: useAdvancedNullabilityCheck
                  ? `${change.breakingChangeSchemaCoordinate}!`
                  : null,
              }),
            ]);
            const operations = topAffectedOperations ?? [];
            const operationTargets = targets?.length
              ? await this.countOperationTargetUsage(
                  read,
                  operations.map(operation => operation.hash),
                )
              : null;

            change.usageStatistics = {
              topAffectedOperations: operations.map((operation, index) => ({
                ...operation,
                affectedTargets: operationTargets?.[index],
              })),
              topAffectedClients: topAffectedClients ?? [],
              ...(targets?.length
                ? { affectedTargets: targets, schemaCoordinate: checkCoordinate }
                : {}),
            };
          }

          change.isSafeBasedOnUsage = !isBreaking;
        }),
      );
    } else {
      this.logger.debug('No conditional breaking change settings available');
    }

    // Check against active app deployments if function is provided
    if (args.getAffectedAppDeployments) {
      // Collect all coordinates from breaking changes and initialize affectedAppDeployments to []
      const breakingCoordinates = new Set<string>();
      for (const change of inspectorChanges) {
        if (isSubjectToUsageCheck(change)) {
          // Initialize affectedAppDeployments to empty array for all breaking changes
          change.affectedAppDeployments = [];
          const coordinate = change.breakingChangeSchemaCoordinate ?? change.path;
          if (coordinate) {
            breakingCoordinates.add(coordinate);
          }
        }
      }

      if (breakingCoordinates.size > 0) {
        this.logger.debug(
          'Checking affected app deployments for %d breaking schema coordinates',
          breakingCoordinates.size,
        );

        try {
          const result = await args.getAffectedAppDeployments(Array.from(breakingCoordinates));

          if (result.size) {
            this.logger.debug('app deployments affected by breaking changes');

            // Mark changes as unsafe if they affect active app deployments
            for (const change of inspectorChanges) {
              if (!isSubjectToUsageCheck(change)) {
                continue;
              }
              const coordinate = change.breakingChangeSchemaCoordinate ?? change.path;
              if (!coordinate) {
                continue;
              }

              const data = result.get(coordinate);

              if (!data) {
                continue;
              }

              // Check if any deployment is affected by this specific coordinate
              // Override usage-based safety: change is NOT safe if app deployments are affected
              change.isSafeBasedOnUsage = false;
              // Update affected app deployments for this change
              change.affectedAppDeployments = data;
            }
          } else {
            this.logger.debug('No app deployments affected by breaking changes');
          }
        } catch (error) {
          this.logger.error(
            'Failed to check affected app deployments (coordinateCount=%d): %s',
            breakingCoordinates.size,
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }
      }
    }

    if (args.includeUrlChanges) {
      inspectorChanges.push(
        ...detectUrlChanges(
          args.includeUrlChanges.schemasBefore,
          args.includeUrlChanges.schemasAfter,
        ),
      );
    }

    let isFailure = false;
    const safeChanges: Array<SchemaChangeType> = [];
    const breakingChanges: Array<SchemaChangeType> = [];

    for (const change of inspectorChanges) {
      if (change.criticality === CriticalityLevel.Breaking || isFailingDangerousChange(change)) {
        if (change.isSafeBasedOnUsage === true) {
          breakingChanges.push(change);
          continue;
        }

        // If this change is approved, we return the already approved on instead of the newly detected one,
        // as it it contains the necessary metadata on when the change got first approved and by whom.
        const approvedChange = args.approvedChanges?.get(change.id);
        if (approvedChange) {
          breakingChanges.push({
            ...approvedChange,
            isSafeBasedOnUsage: change.isSafeBasedOnUsage,
            usageStatistics: change.usageStatistics,
          });
          continue;
        }
        isFailure = true;
        breakingChanges.push(change);
        continue;
      }
      safeChanges.push(change);
    }

    if (isFailure === true) {
      this.logger.debug('Detected breaking changes');
      return {
        status: 'failed',
        reason: {
          breaking: breakingChanges,
          safe: safeChanges.length ? safeChanges : null,
          get all() {
            if (breakingChanges.length || safeChanges.length) {
              return [...breakingChanges, ...safeChanges];
            }
            return null;
          },
        },
      } satisfies SchemaDiffFailure;
    }

    if (inspectorChanges.length) {
      this.logger.debug('Detected non-breaking changes');
    }

    return {
      status: 'completed',
      result: {
        breaking: breakingChanges.length ? breakingChanges : null,
        safe: safeChanges.length ? safeChanges : null,
        get all() {
          if (breakingChanges.length || safeChanges.length) {
            return [...breakingChanges, ...safeChanges];
          }
          return null;
        },
      },
    } satisfies SchemaDiffSuccess;
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);

      return true;
    } catch {
      return false;
    }
  }

  async serviceUrl(newServiceUrl: string | null, existingServiceUrl: string | null) {
    if (newServiceUrl === null) {
      if (existingServiceUrl) {
        return {
          status: 'completed',
          result: {
            status: 'unchanged' as const,
            serviceUrl: existingServiceUrl,
          },
        } satisfies CheckResult;
      }

      return {
        status: 'failed',
        reason: 'Service url is required',
      } satisfies CheckResult;
    }

    if (newServiceUrl === existingServiceUrl) {
      return {
        status: 'completed',
        result: {
          status: 'unchanged' as const,
          serviceUrl: existingServiceUrl,
        },
      } satisfies CheckResult;
    }

    if (!this.isValidURL(newServiceUrl)) {
      return {
        status: 'failed',
        reason: 'Invalid service URL provided',
      } satisfies CheckResult;
    }

    return {
      status: 'completed',
      result: {
        message: `New service url: ${newServiceUrl} (previously: ${existingServiceUrl ?? 'none'})`,
        status: 'modified' as const,
        before: existingServiceUrl,
        after: newServiceUrl,
        serviceUrl: newServiceUrl,
      },
    } satisfies CheckResult;
  }

  async metadata(
    service: {
      metadata?: string | null;
    },
    existingService: { metadata?: string | null } | null,
  ) {
    try {
      const parsed = service.metadata
        ? (JSON.parse(service.metadata) as Record<string, unknown>)
        : null;

      const modified =
        existingService &&
        hashObject(parsed) !==
          hashObject(existingService.metadata ? JSON.parse(existingService.metadata) : null);

      if (modified) {
        this.logger.debug('Metadata is modified');
      } else {
        this.logger.debug('Metadata is unchanged');
      }

      return {
        status: 'completed',
        result: {
          status: modified ? ('modified' as const) : ('unchanged' as const),
        },
      } satisfies CheckResult;
    } catch (e) {
      this.logger.debug('Failed to parse metadata');
      return {
        status: 'failed',
        reason: String(e instanceof Error ? e.message : e),
      } satisfies CheckResult;
    }
  }

  public checkProjectNativeFederationSupport(
    targetId: string,
    project: Project,
    organization: Organization,
  ): boolean {
    if (project.type !== ProjectType.FEDERATION) {
      return false;
    }

    if (project.nativeFederation === false) {
      return false;
    }

    if (organization.featureFlags.forceLegacyCompositionInTargets.includes(targetId)) {
      this.logger.warn(
        'Project is using legacy composition in target, ignoring native Federation support (organization=%s, project=%s, target=%s)',
        organization.id,
        project.id,
        targetId,
      );
      return false;
    }

    this.logger.debug(
      'Native Federation support available (organization=%s, project=%s)',
      organization.id,
      project.id,
    );
    return true;
  }

  /**
   * Best effort, like the next one: on failure the check goes on without it. With
   * `providedCoordinate`, only requests that omit the value count, which is what breaks when an
   * input becomes required.
   */
  private async countTargetUsage(args: {
    read: PerTargetRead;
    coordinate: string;
    providedCoordinate: string | null;
  }) {
    try {
      const [onCoordinate, provided] = await Promise.all([
        this.operationsReader.countCoordinatePerTarget({
          ...args.read,
          schemaCoordinate: args.coordinate,
        }),
        args.providedCoordinate
          ? this.operationsReader.countCoordinatePerTarget({
              ...args.read,
              schemaCoordinate: args.providedCoordinate,
            })
          : Promise.resolve([]),
      ]);
      if (!args.providedCoordinate) {
        return onCoordinate;
      }
      const providedCounts = new Map(provided.map(target => [target.id, target.count]));
      return onCoordinate
        .map(target => ({
          id: target.id,
          count: target.count - (providedCounts.get(target.id) ?? 0),
        }))
        .filter(target => target.count > 0)
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.error(
        'Failed to count breaking change usage per target (error=%s)',
        String(error),
      );
      return null;
    }
  }

  private async countOperationTargetUsage(read: PerTargetRead, hashes: string[]) {
    try {
      return await Promise.all(
        hashes.map(hash => this.operationsReader.getOperationCountsPerTarget({ ...read, hash })),
      );
    } catch (error) {
      this.logger.error('Failed to count operation usage per target (error=%s)', String(error));
      return null;
    }
  }
}

type PerTargetRead = {
  targetIds: readonly string[];
  excludedClients: readonly string[] | null;
  period: DateRange;
};

type SubgraphDefinition = {
  serviceName: string;
  serviceUrl: string | null;
};

export function detectUrlChanges(
  subgraphsBefore: readonly SubgraphDefinition[],
  subgraphsAfter: readonly SubgraphDefinition[],
): Array<SchemaChangeType> {
  if (subgraphsBefore.length === 0) {
    return [];
  }

  if (subgraphsBefore.length === 0) {
    return [];
  }

  const nameToCompositeSchemaMap = new Map(subgraphsBefore.map(s => [s.serviceName, s]));
  const changes: Array<RegistryServiceUrlChangeSerializableChange> = [];

  for (const schema of subgraphsAfter) {
    const before = nameToCompositeSchemaMap.get(schema.serviceName);

    if (before && before.serviceUrl !== schema.serviceUrl) {
      if (before.serviceUrl != null && schema.serviceUrl != null) {
        changes.push({
          type: 'REGISTRY_SERVICE_URL_CHANGED',
          meta: {
            serviceName: schema.serviceName,
            serviceUrls: {
              old: before.serviceUrl,
              new: schema.serviceUrl,
            },
          },
        });
      } else if (before.serviceUrl != null && schema.serviceUrl == null) {
        changes.push({
          type: 'REGISTRY_SERVICE_URL_CHANGED',
          meta: {
            serviceName: schema.serviceName,
            serviceUrls: {
              old: before.serviceUrl,
              new: null,
            },
          },
        });
      } else if (before.serviceUrl == null && schema.serviceUrl != null) {
        changes.push({
          type: 'REGISTRY_SERVICE_URL_CHANGED',
          meta: {
            serviceName: schema.serviceName,
            serviceUrls: {
              old: null,
              new: schema.serviceUrl,
            },
          },
        });
      } else {
        throw new Error(
          `This shouldn't happen (before.serviceUrl=${JSON.stringify(before.serviceUrl)}, schema.serviceUrl=${JSON.stringify(schema.serviceUrl)}).`,
        );
      }
    }
  }

  return changes.map(change =>
    HiveSchemaChangeModel.parse({
      type: change.type,
      meta: change.meta,
      isSafeBasedOnUsage: false,
    }),
  );
}

const toSchemaCheckWarning = (record: CheckPolicyResponse[number]): SchemaCheckWarning => ({
  message: record.message,
  source: record.ruleId ? `policy-${record.ruleId}` : 'policy',
  column: record.column,
  line: record.line,
  ruleId: record.ruleId ?? 'policy',
  endColumn: record.endColumn ?? null,
  endLine: record.endLine ?? null,
});

function compareAlphaNumeric(a: string, b: string) {
  return a.localeCompare(b, 'en', { numeric: true });
}

function requiresAdvancedNullabilityCheck(change: SchemaChangeType) {
  if (ChangeType.InputFieldTypeChanged === (change.type as TypeOfChangeType)) {
    const oldType = change.meta.oldInputFieldType?.toString();
    const newType = change.meta.newInputFieldType?.toString();
    return `${oldType}!` === newType;
  }
  return isNullToRequiredArgumentChange(change);
}

function isNullToRequiredArgumentChange(change: SchemaChangeType) {
  if (ChangeType.FieldArgumentTypeChanged === (change.type as TypeOfChangeType)) {
    const oldType = change.meta.oldArgumentType?.toString();
    const newType = change.meta.newArgumentType?.toString();
    return `${oldType}!` === newType;
  }
  return false;
}
