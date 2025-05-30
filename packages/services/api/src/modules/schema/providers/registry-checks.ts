import { URL } from 'node:url';
import { type GraphQLSchema } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import hashObject from 'object-hash';
import { ChangeType, CriticalityLevel } from '@graphql-inspector/core';
import type { CheckPolicyResponse } from '@hive/policy';
import type { CompositionFailureError, ContractsInputType } from '@hive/schema';
import { traceFn } from '@hive/service-common';
import {
  HiveSchemaChangeModel,
  type RegistryServiceUrlChangeSerializableChange,
  type SchemaChangeType,
} from '@hive/storage';
import { ProjectType } from '../../../shared/entities';
import { buildSortedSchemaFromSchemaObject } from '../../../shared/schema';
import { OperationsReader } from '../../operations/providers/operations-reader';
import { SchemaPolicyProvider } from '../../policy/providers/schema-policy.provider';
import type {
  ComposeAndValidateResult,
  DateRange,
  Organization,
  Project,
  PushedCompositeSchema,
  SingleSchema,
} from './../../../shared/entities';
import { Logger } from './../../shared/providers/logger';
import { diffSchemaCoordinates, Inspector, SchemaCoordinatesDiffResult } from './inspector';
import { SchemaCheckWarning } from './models/shared';
import { CompositionOrchestrator } from './orchestrator/composition-orchestrator';
import { extendWithBase, isCompositeSchema, SchemaHelper } from './schema-helper';

export type ConditionalBreakingChangeDiffConfig = {
  period: DateRange;
  requestCountThreshold: number;
  targetIds: string[];
  excludedClientNames: string[] | null;
};

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

type Schemas = [SingleSchema] | PushedCompositeSchema[];

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
    coordinatesDiff: SchemaCoordinatesDiffResult | null;
  };
  result?: never;
};

export type SchemaDiffSuccess = {
  status: 'completed';
  result: {
    breaking: Array<SchemaChangeType> | null;
    safe: Array<SchemaChangeType> | null;
    all: Array<SchemaChangeType> | null;
    coordinatesDiff: SchemaCoordinatesDiffResult | null;
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
    private inspector: Inspector,
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
  async checksum(args: {
    incoming: {
      schema: SingleSchema | PushedCompositeSchema;
      contractNames: null | Array<string>;
    };
    existing: null | {
      schema: SingleSchema | PushedCompositeSchema;
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
      this.logger.debug('No exiting version');
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
    schemas: Schemas;
    baseSchema: string | null;
    contracts: null | ContractsInputType;
  }) {
    const result = await this.orchestrator.composeAndValidate(
      CompositionOrchestrator.projectTypeToOrchestratorType(project.type),
      extendWithBase(schemas, baseSchema).map(s => this.helper.createSchemaObject(s)),
      {
        external: project.externalComposition,
        native: this.checkProjectNativeFederationSupport(targetId, project, organization),
        contracts,
      },
    );

    const validationErrors = result.errors;

    if (Array.isArray(validationErrors) && validationErrors.length) {
      this.logger.debug('Detected validation errors');

      return {
        status: 'failed',
        reason: {
          errors: validationErrors,
          errorsBySource: {
            graphql: validationErrors.filter(isGraphQLValidationError),
            composition: validationErrors.filter(isCompositionValidationError),
          },
          // Federation 1 apparently has SDL and validation errors at the same time.
          fullSchemaSdl: result.sdl,
          contracts: result.contracts?.map(mapContract) ?? null,
          includesNetworkError: result.includesNetworkError ?? false,
          includesException: result.includesException ?? false,
        },
      } satisfies CheckResult;
    }

    if (!result.sdl) {
      throw new Error('No SDL, but no errors either');
    }

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
      schemas: Schemas;
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
      args.version.schemas.map(s => this.helper.createSchemaObject(s)),
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
      };
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
          schemasBefore: [SingleSchema] | PushedCompositeSchema[];
          schemasAfter: [SingleSchema] | PushedCompositeSchema[];
        };
    /** Whether Federation directive related changes should be filtered out from the list of changes. These would only show up due to an internal bug. */
    filterOutFederationChanges: boolean;
    /** Lookup map of changes that are approved and thus safe. */
    approvedChanges: null | Map<string, SchemaChangeType>;
    /** Settings for fetching conditional breaking changes. */
    conditionalBreakingChangeConfig: null | ConditionalBreakingChangeDiffConfig;
    failDiffOnDangerousChange: null | boolean;
  }) {
    let existingSchema: GraphQLSchema | null = null;
    let incomingSchema: GraphQLSchema | null = null;

    try {
      existingSchema = args.existingSdl
        ? buildSortedSchemaFromSchemaObject(
            this.helper.createSchemaObject({
              sdl: args.existingSdl,
            }),
          )
        : null;

      incomingSchema = args.incomingSdl
        ? buildSortedSchemaFromSchemaObject(
            this.helper.createSchemaObject({
              sdl: args.incomingSdl,
            }),
          )
        : null;
    } catch (error) {
      this.logger.error('Failed to build schema for diff. Skip diff check.');
      return {
        status: 'skipped',
      } satisfies CheckResult;
    }

    if (existingSchema === null || incomingSchema === null) {
      this.logger.debug('Skip diff check due to either existing or incoming SDL being absent.');
      return {
        status: 'skipped',
        data: {
          coordinatesDiff: incomingSchema ? diffSchemaCoordinates(null, incomingSchema) : null,
        },
      } satisfies CheckResult;
    }

    let inspectorChanges = await this.inspector.diff(existingSchema, incomingSchema);

    // Filter out federation specific changes as they are not relevant for the schema diff and were in previous schema versions by accident.
    if (args.filterOutFederationChanges === true) {
      inspectorChanges = inspectorChanges.filter(change => !isFederationRelatedChange(change));
    }

    if (args.conditionalBreakingChangeConfig) {
      this.logger.debug('Conditional breaking change settings available.');
      const settings = args.conditionalBreakingChangeConfig;

      this.logger.debug('Fetching affected operations and affected clients for breaking changes.');

      await Promise.all(
        inspectorChanges.map(async change => {
          if (
            change.criticality !== CriticalityLevel.Breaking ||
            !change.breakingChangeSchemaCoordinate
          ) {
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
          if (isBreaking) {
            const useAdvancedNullabilityCheck = requiresAdvancedNullabilityCheck(change);

            if (useAdvancedNullabilityCheck) {
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

            const [topAffectedClients, topAffectedOperations] = await Promise.all([
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
            ]);

            change.usageStatistics = {
              topAffectedOperations: topAffectedOperations ?? [],
              topAffectedClients: topAffectedClients ?? [],
            };
          }

          change.isSafeBasedOnUsage = !isBreaking;
        }),
      );
    } else {
      this.logger.debug('No conditional breaking change settings available');
    }

    if (args.includeUrlChanges) {
      inspectorChanges.push(
        ...detectUrlChanges(
          args.includeUrlChanges.schemasBefore.filter(isCompositeSchema),
          args.includeUrlChanges.schemasAfter.filter(isCompositeSchema),
        ),
      );
    }

    let isFailure = false;
    const safeChanges: Array<SchemaChangeType> = [];
    const breakingChanges: Array<SchemaChangeType> = [];

    const coordinatesDiff = diffSchemaCoordinates(existingSchema, incomingSchema);

    for (const change of inspectorChanges) {
      if (
        change.criticality === CriticalityLevel.Breaking ||
        (args.failDiffOnDangerousChange && change.criticality === CriticalityLevel.Dangerous)
      ) {
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
          coordinatesDiff,
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
        coordinatesDiff,
      },
    } satisfies SchemaDiffSuccess;
  }

  async serviceName(service: { name: string | null }) {
    if (!service.name) {
      this.logger.debug('No service name');
      return {
        status: 'failed',
        reason: 'Service name is required',
      } satisfies CheckResult;
    }

    this.logger.debug('Service name is defined');

    return {
      status: 'completed',
      result: null,
    } satisfies CheckResult;
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);

      return true;
    } catch {
      return false;
    }
  }

  async serviceUrl(
    service: { url: string | null },
    existingService: { url: string | null } | null,
  ) {
    if (!service.url) {
      this.logger.debug('No service url');
      return {
        status: 'failed',
        reason: 'Service url is required',
      } satisfies CheckResult;
    }

    this.logger.debug('Service url is defined');

    if (!this.isValidURL(service.url)) {
      return {
        status: 'failed',
        reason: 'Invalid service URL provided',
      } satisfies CheckResult;
    }

    return {
      status: 'completed',
      result:
        existingService && service.url !== existingService.url
          ? {
              before: existingService.url,
              after: service.url,
              message: service.url
                ? `New service url: ${service.url} (previously: ${existingService.url ?? 'none'})`
                : `Service url removed (previously: ${existingService.url ?? 'none'})`,
              status: 'modified' as const,
            }
          : {
              status: 'unchanged' as const,
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
}

type SubgraphDefinition = {
  service_name: string;
  service_url: string | null;
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

  const nameToCompositeSchemaMap = new Map(subgraphsBefore.map(s => [s.service_name, s]));
  const changes: Array<RegistryServiceUrlChangeSerializableChange> = [];

  for (const schema of subgraphsAfter) {
    const before = nameToCompositeSchemaMap.get(schema.service_name);

    if (before && before.service_url !== schema.service_url) {
      if (before.service_url != null && schema.service_url != null) {
        changes.push({
          type: 'REGISTRY_SERVICE_URL_CHANGED',
          meta: {
            serviceName: schema.service_name,
            serviceUrls: {
              old: before.service_url,
              new: schema.service_url,
            },
          },
        });
      } else if (before.service_url != null && schema.service_url == null) {
        changes.push({
          type: 'REGISTRY_SERVICE_URL_CHANGED',
          meta: {
            serviceName: schema.service_name,
            serviceUrls: {
              old: before.service_url,
              new: null,
            },
          },
        });
      } else if (before.service_url == null && schema.service_url != null) {
        changes.push({
          type: 'REGISTRY_SERVICE_URL_CHANGED',
          meta: {
            serviceName: schema.service_name,
            serviceUrls: {
              old: null,
              new: schema.service_url,
            },
          },
        });
      } else {
        throw new Error(
          `This shouldn't happen (before.service_url=${JSON.stringify(before.service_url)}, schema.service_url=${JSON.stringify(schema.service_url)}).`,
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

const federationTypes = new Set([
  'join__FieldSet',
  'join__Graph',
  'link__Import',
  'link__Purpose',
  'core__Purpose',
  'policy__Policy',
  'requiresScopes__Scope',
  'join__DirectiveArguments',
]);
const federationDirectives = new Set([
  '@join__enumValue',
  '@join__field',
  '@join__graph',
  '@join__implements',
  '@join__type',
  '@join__owner',
  '@join__unionMember',
  '@link',
  '@federation__inaccessible',
  '@inaccessible',
  '@tag',
  '@core',
  '@federation__tag',
]);

function isFederationRelatedChange(change: SchemaChangeType) {
  return change.path && (federationTypes.has(change.path) || federationDirectives.has(change.path));
}

function compareAlphaNumeric(a: string, b: string) {
  return a.localeCompare(b, 'en', { numeric: true });
}

function requiresAdvancedNullabilityCheck(change: Awaited<ReturnType<Inspector['diff']>>[number]) {
  if (ChangeType.InputFieldTypeChanged === (change.type as ChangeType)) {
    const oldType = change.meta.oldInputFieldType?.toString();
    const newType = change.meta.newInputFieldType?.toString();
    return `${oldType}!` === newType;
  }
  return isNullToRequiredArgumentChange(change);
}

function isNullToRequiredArgumentChange(change: Awaited<ReturnType<Inspector['diff']>>[number]) {
  if (ChangeType.FieldArgumentTypeChanged === (change.type as ChangeType)) {
    const oldType = change.meta.oldArgumentType?.toString();
    const newType = change.meta.newArgumentType?.toString();
    return `${oldType}!` === newType;
  }
  return false;
}
