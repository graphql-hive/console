import { Injectable, Scope } from 'graphql-modules';
import { traceFn } from '@hive/service-common';
import { SchemaChangeType } from '@hive/storage';
import { AppDeployments } from '../../../app-deployments/providers/app-deployments';
import {
  ConditionalBreakingChangeDiffConfig,
  GetAffectedAppDeployments,
  RegistryChecks,
} from '../registry-checks';
import { SingleSchemaInput } from '../schema-helper';
import type { Organization, Project, Target } from './../../../../shared/entities';
import { Logger } from './../../../shared/providers/logger';
import {
  buildSchemaCheckFailureState,
  PublishFailureReasonCode,
  PublishIgnoreReasonCode /* Check */,
  SchemaCheckConclusion,
  SchemaCheckResult /* Publish */,
  SchemaPublishConclusion,
  SchemaPublishResult,
  temp,
} from './shared';

@Injectable({
  scope: Scope.Operation,
})
export class SingleModel {
  constructor(
    private checks: RegistryChecks,
    private logger: Logger,
    private appDeployments: AppDeployments,
  ) {}

  @traceFn('Single modern: diffSchema')
  async diffSchema({
    input,
    latest,
  }: {
    input: {
      sdl: string;
    };
    latest: {
      schemas: [SingleSchema];
    } | null;
  }) {
    return this.checks.serviceDiff({
      existingSdl: latest?.schemas[0]?.sdl ?? null,
      incomingSdl: input.sdl,
    });
  }

  @traceFn('Single modern: check', {
    initAttributes: args => ({
      'hive.project.id': args.selector.projectId,
      'hive.target.id': args.selector.targetId,
      'hive.organization.id': args.selector.organizationId,
    }),
  })
  async check({
    input,
    selector,
    latest,
    latestComposable,
    project,
    organization,
    baseSchema,
    approvedChanges,
    conditionalBreakingChangeDiffConfig,
    failDiffOnDangerousChange,
    filterNestedChanges,
  }: {
    input: {
      sdl: string;
    };
    selector: {
      organizationId: string;
      projectId: string;
      targetId: string;
    };
    latest: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchemaInput];
    } | null;
    latestComposable: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchemaInput];
    } | null;
    baseSchema: string | null;
    project: Project;
    organization: Organization;
    approvedChanges: Map<string, SchemaChangeType>;
    conditionalBreakingChangeDiffConfig: null | ConditionalBreakingChangeDiffConfig;
    failDiffOnDangerousChange: boolean;
    filterNestedChanges: boolean;
  }): Promise<SchemaCheckResult> {
    const incoming: SingleSchemaInput = {
      id: temp,
      sdl: input.sdl,
      metadata: null,
      serviceName: null,
      serviceUrl: null,
    };

    const schemas = [incoming] as [SingleSchemaInput];
    const comparedVersion = organization.featureFlags.compareToPreviousComposableVersion
      ? latestComposable
      : latest;

    const checksumResult = await this.checks.checksum({
      existing: latest
        ? {
            schema: latest.schemas[0],
            contractNames: null,
          }
        : null,
      incoming: {
        schema: incoming,
        contractNames: null,
      },
    });

    if (checksumResult === 'unchanged') {
      this.logger.debug('No changes detected, skipping schema check');
      return {
        conclusion: SchemaCheckConclusion.Skip,
      };
    }

    const compositionCheck = await this.checks.composition({
      targetId: selector.targetId,
      project,
      organization,
      schemas,
      baseSchema,
      contracts: null,
    });

    const previousVersionSdl = comparedVersion?.sdl ?? null;

    const getAffectedAppDeployments: GetAffectedAppDeployments = (
      schemaCoordinates,
      firstDeployments,
      firstOperations,
    ) =>
      this.appDeployments.getAffectedAppDeploymentsBySchemaCoordinates({
        targetId: selector.targetId,
        schemaCoordinates,
        firstDeployments,
        firstOperations,
        excludedAppDeploymentNames: conditionalBreakingChangeDiffConfig?.excludedAppDeploymentNames,
      });

    const [diffCheck, policyCheck] = await Promise.all([
      this.checks.diff({
        conditionalBreakingChangeConfig: conditionalBreakingChangeDiffConfig,
        includeUrlChanges: false,
        filterOutFederationChanges: false,
        approvedChanges,
        existingSdl: previousVersionSdl,
        incomingSdl: compositionCheck.result?.fullSchemaSdl ?? null,
        failDiffOnDangerousChange,
        filterNestedChanges,
        getAffectedAppDeployments,
      }),
      this.checks.policyCheck({
        selector,
        modifiedSdl: input.sdl,
        incomingSdl: compositionCheck.result?.fullSchemaSdl ?? null,
      }),
    ]);

    if (
      compositionCheck.status === 'failed' ||
      diffCheck.status === 'failed' ||
      policyCheck.status === 'failed'
    ) {
      return {
        conclusion: SchemaCheckConclusion.Failure,
        state: buildSchemaCheckFailureState({
          compositionCheck,
          diffCheck,
          policyCheck,
          contractChecks: null,
        }),
      };
    }

    return {
      conclusion: SchemaCheckConclusion.Success,
      state: {
        schemaChanges: diffCheck.result ?? null,
        schemaPolicyWarnings: policyCheck.result?.warnings ?? null,
        composition: {
          compositeSchemaSDL: compositionCheck.result.fullSchemaSdl,
          supergraphSDL: compositionCheck.result.supergraph,
        },
        contracts: null,
      },
    };
  }

  async publish({
    input,
    target,
    project,
    organization,
    latest,
    latestComposable,
    baseSchema,
    conditionalBreakingChangeDiffConfig,
    failDiffOnDangerousChange,
  }: {
    input: {
      sdl: string;
      metadata: string | null;
    };
    organization: Organization;
    project: Project;
    target: Target;
    latest: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchemaInput];
    } | null;
    latestComposable: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchemaInput];
    } | null;
    baseSchema: string | null;
    conditionalBreakingChangeDiffConfig: null | ConditionalBreakingChangeDiffConfig;
    failDiffOnDangerousChange: boolean;
  }): Promise<SchemaPublishResult> {
    const incoming: SingleSchemaInput = {
      id: temp,
      sdl: input.sdl,
      metadata: input.metadata,
      serviceName: null,
      serviceUrl: null,
    };

    const latestVersion = latest;
    const schemas = [incoming] as [SingleSchemaInput];
    const compareToPreviousComposableVersion =
      organization.featureFlags.compareToPreviousComposableVersion;
    const comparedVersion = compareToPreviousComposableVersion ? latestComposable : latest;

    const checksumCheck = await this.checks.checksum({
      existing: latest
        ? {
            schema: latest.schemas[0],
            contractNames: null,
          }
        : null,
      incoming: {
        schema: incoming,
        contractNames: null,
      },
    });

    if (checksumCheck === 'unchanged') {
      return {
        conclusion: SchemaPublishConclusion.Ignore,
        reason: PublishIgnoreReasonCode.NoChanges,
      };
    }

    const compositionCheck = await this.checks.composition({
      targetId: target.id,
      project,
      organization,
      baseSchema,
      schemas: [
        baseSchema
          ? {
              ...incoming,
              sdl: baseSchema + ' ' + incoming.sdl,
            }
          : incoming,
      ],
      contracts: null,
    });

    const previousVersionSdl = await this.checks.retrievePreviousVersionSdl({
      version: comparedVersion,
      organization,
      project,
      targetId: target.id,
    });

    const getAffectedAppDeploymentsForPublish: GetAffectedAppDeployments = (
      schemaCoordinates,
      firstDeployments,
      firstOperations,
    ) =>
      this.appDeployments.getAffectedAppDeploymentsBySchemaCoordinates({
        targetId: target.id,
        schemaCoordinates,
        firstDeployments,
        firstOperations,
        excludedAppDeploymentNames: conditionalBreakingChangeDiffConfig?.excludedAppDeploymentNames,
      });

    const [metadataCheck, diffCheck] = await Promise.all([
      this.checks.metadata(incoming, latestVersion ? latestVersion.schemas[0] : null),
      this.checks.diff({
        conditionalBreakingChangeConfig: conditionalBreakingChangeDiffConfig,
        filterOutFederationChanges: false,
        includeUrlChanges: false,
        approvedChanges: null,
        existingSdl: previousVersionSdl,
        incomingSdl: compositionCheck.result?.fullSchemaSdl ?? null,
        failDiffOnDangerousChange,
        filterNestedChanges: true, // publish is never associated with schema proposals in this way. So always show the minimal changeset.
        getAffectedAppDeployments: getAffectedAppDeploymentsForPublish,
      }),
    ]);

    if (metadataCheck.status === 'failed') {
      return {
        conclusion: SchemaPublishConclusion.Reject,
        reasons: [
          {
            code: PublishFailureReasonCode.MetadataParsingFailure,
          },
        ],
      };
    }

    const hasNewMetadata =
      metadataCheck.status === 'completed' && metadataCheck.result.status === 'modified';

    const messages: string[] = [];

    if (hasNewMetadata) {
      messages.push('Metadata has been updated');
    }

    if (
      compositionCheck.status === 'failed' &&
      compositionCheck.reason.errorsBySource.graphql.length > 0
    ) {
      if (organization.featureFlags.compareToPreviousComposableVersion === false) {
        return {
          conclusion: SchemaPublishConclusion.Reject,
          reasons: [
            {
              code: PublishFailureReasonCode.CompositionFailure,
              compositionErrors: compositionCheck.reason.errorsBySource.graphql,
            },
          ],
        };
      }
    }

    return {
      conclusion: SchemaPublishConclusion.Publish,
      state: {
        composable: compositionCheck.status === 'completed',
        initial: latestVersion === null,
        changes: diffCheck.result?.all ?? diffCheck.reason?.all ?? null,
        messages,
        breakingChanges: null,
        coordinatesDiff:
          diffCheck.result?.coordinatesDiff ??
          diffCheck.reason?.coordinatesDiff ??
          diffCheck.data?.coordinatesDiff ??
          null,
        compositionErrors: compositionCheck.reason?.errors ?? null,
        schema: incoming,
        schemas,
        supergraph: null,
        fullSchemaSdl: compositionCheck.result?.fullSchemaSdl ?? null,
        tags: compositionCheck.result?.tags ?? null,
        contracts: null,
        schemaMetadata: compositionCheck.result?.schemaMetadata ?? null,
        metadataAttributes: compositionCheck.result?.metadataAttributes ?? null,
      },
    };
  }
}
