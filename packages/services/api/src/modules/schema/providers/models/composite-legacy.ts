import { Injectable, Scope } from 'graphql-modules';
import { FederationOrchestrator } from '../orchestrators/federation';
import { StitchingOrchestrator } from '../orchestrators/stitching';
import { RegistryChecks, type ConditionalBreakingChangeDiffConfig } from '../registry-checks';
import { swapServices } from '../schema-helper';
import type { PublishInput } from '../schema-publisher';
import type {
  Organization,
  Project,
  PushedCompositeSchema,
  Target,
} from './../../../../shared/entities';
import { ProjectType } from './../../../../shared/entities';
import { Logger } from './../../../shared/providers/logger';
import {
  buildSchemaCheckFailureState,
  PublishFailureReasonCode,
  PublishIgnoreReasonCode /* Check */,
  SchemaCheckConclusion,
  SchemaCheckResult /* Publish */,
  SchemaPublishConclusion,
  SchemaPublishFailureReason,
  SchemaPublishResult,
  temp,
} from './shared';

@Injectable({
  scope: Scope.Operation,
})
export class CompositeLegacyModel {
  constructor(
    private federation: FederationOrchestrator,
    private stitching: StitchingOrchestrator,
    private checks: RegistryChecks,
    private logger: Logger,
  ) {}

  async check({
    input,
    selector,
    latest,
    project,
    organization,
    baseSchema,
    conditionalBreakingChangeDiffConfig,
  }: {
    input: {
      sdl: string;
      serviceName: string;
    };
    selector: {
      organizationId: string;
      projectId: string;
      targetId: string;
    };
    latest: {
      isComposable: boolean;
      sdl: string | null;
      schemas: PushedCompositeSchema[];
    } | null;
    baseSchema: string | null;
    project: Project;
    organization: Organization;
    conditionalBreakingChangeDiffConfig: null | ConditionalBreakingChangeDiffConfig;
  }): Promise<SchemaCheckResult> {
    const incoming: PushedCompositeSchema = {
      kind: 'composite',
      id: temp,
      author: temp,
      commit: temp,
      target: selector.targetId,
      date: Date.now(),
      sdl: input.sdl,
      service_name: input.serviceName,
      service_url: temp,
      action: 'PUSH',
      metadata: null,
    };

    const latestVersion = latest;
    const schemaSwapResult = latestVersion ? swapServices(latestVersion.schemas, incoming) : null;
    const schemas = schemaSwapResult ? schemaSwapResult.schemas : [incoming];
    schemas.sort((a, b) => a.service_name.localeCompare(b.service_name));
    const orchestrator = project.type === ProjectType.FEDERATION ? this.federation : this.stitching;

    const checksumCheck = await this.checks.checksum({
      existing: schemaSwapResult?.existing
        ? {
            schema: schemaSwapResult.existing,
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
        conclusion: SchemaCheckConclusion.Skip,
      };
    }

    const compositionCheck = await this.checks.composition({
      orchestrator,
      targetId: selector.targetId,
      project,
      organization,
      schemas,
      baseSchema,
      contracts: null,
    });

    const previousVersionSdl = await this.checks.retrievePreviousVersionSdl({
      orchestrator,
      version: latest,
      organization,
      project,
      targetId: selector.targetId,
    });

    const diffCheck = await this.checks.diff({
      includeUrlChanges: false,
      filterOutFederationChanges: project.type === ProjectType.FEDERATION,
      approvedChanges: null,
      existingSdl: previousVersionSdl,
      incomingSdl:
        compositionCheck.result?.fullSchemaSdl ?? compositionCheck.reason?.fullSchemaSdl ?? null,
      conditionalBreakingChangeConfig: conditionalBreakingChangeDiffConfig,
    });

    if (compositionCheck.status === 'failed' || diffCheck.status === 'failed') {
      return {
        conclusion: SchemaCheckConclusion.Failure,
        state: buildSchemaCheckFailureState({
          compositionCheck,
          diffCheck,
          policyCheck: null,
          contractChecks: null,
        }),
      };
    }

    return {
      conclusion: SchemaCheckConclusion.Success,
      state: {
        schemaChanges: diffCheck.result ?? null,
        schemaPolicyWarnings: null,
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
    latest,
    project,
    organization,
    baseSchema,
    conditionalBreakingChangeDiffConfig,
  }: {
    input: PublishInput;
    project: Project;
    organization: Organization;
    target: Target;
    latest: {
      isComposable: boolean;
      sdl: string | null;
      schemas: PushedCompositeSchema[];
    } | null;
    baseSchema: string | null;
    conditionalBreakingChangeDiffConfig: null | ConditionalBreakingChangeDiffConfig;
  }): Promise<SchemaPublishResult> {
    const incoming: PushedCompositeSchema = {
      kind: 'composite',
      id: temp,
      author: input.author,
      sdl: input.sdl,
      commit: input.commit,
      target: target.id,
      date: Date.now(),
      service_name: input.service || '',
      service_url: input.url || '',
      action: 'PUSH',
      metadata: input.metadata ?? null,
    };

    const isFederation = project.type === ProjectType.FEDERATION;
    const orchestrator = isFederation ? this.federation : this.stitching;
    const latestVersion = latest;
    const schemaSwapResult = latestVersion ? swapServices(latestVersion.schemas, incoming) : null;
    const previousService = schemaSwapResult?.existing;
    const schemas = schemaSwapResult?.schemas ?? [incoming];
    schemas.sort((a, b) => a.service_name.localeCompare(b.service_name));

    const forced = input.force === true;
    const acceptBreakingChanges = input.experimental_acceptBreakingChanges === true;

    const [serviceNameCheck, serviceUrlCheck] = await Promise.all([
      this.checks.serviceName({
        name: incoming.service_name,
      }),
      this.checks.serviceUrl(
        {
          url: incoming.service_url,
        },
        previousService
          ? {
              url: previousService.service_url,
            }
          : null,
      ),
    ]);

    if (
      serviceNameCheck.status === 'failed' ||
      // If this is a federation, we require a service URL
      (isFederation && serviceUrlCheck.status === 'failed')
    ) {
      return {
        conclusion: SchemaPublishConclusion.Reject,
        reasons: [
          ...(serviceNameCheck.status === 'failed'
            ? [
                {
                  code: PublishFailureReasonCode.MissingServiceName,
                },
              ]
            : []),
          ...(serviceUrlCheck.status === 'failed'
            ? [
                {
                  code: PublishFailureReasonCode.MissingServiceUrl,
                },
              ]
            : []),
        ],
      };
    }

    const checksumCheck = await this.checks.checksum({
      existing: schemaSwapResult?.existing
        ? {
            schema: schemaSwapResult.existing,
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
      orchestrator,
      targetId: target.id,
      project,
      organization,
      schemas,
      baseSchema,
      contracts: null,
    });

    const previousVersionSdl = await this.checks.retrievePreviousVersionSdl({
      orchestrator,
      version: latestVersion,
      organization,
      project,
      targetId: target.id,
    });

    const [diffCheck, metadataCheck] = await Promise.all([
      this.checks.diff({
        includeUrlChanges: {
          schemasBefore: latestVersion?.schemas ?? [],
          schemasAfter: schemas,
        },
        filterOutFederationChanges: isFederation,
        approvedChanges: null,
        existingSdl: previousVersionSdl,
        incomingSdl: compositionCheck.result?.fullSchemaSdl ?? null,
        conditionalBreakingChangeConfig: conditionalBreakingChangeDiffConfig,
      }),
      isFederation
        ? {
            status: 'skipped' as const,
          }
        : this.checks.metadata(incoming, previousService ?? null),
    ]);

    const compositionErrors =
      compositionCheck.status === 'failed' ? compositionCheck.reason.errors : null;
    const breakingChanges =
      diffCheck.status === 'failed' && !acceptBreakingChanges ? diffCheck.reason.breaking : null;
    const changes = diffCheck.result?.all || diffCheck.reason?.all || null;

    const hasNewUrl =
      serviceUrlCheck.status === 'completed' && serviceUrlCheck.result.status === 'modified';
    const hasNewMetadata =
      metadataCheck.status === 'completed' && metadataCheck.result.status === 'modified';
    const hasCompositionErrors = compositionErrors && compositionErrors.length > 0;
    const hasBreakingChanges = breakingChanges && breakingChanges.length > 0;
    const hasErrors = hasCompositionErrors || hasBreakingChanges;

    const shouldBePublished =
      // If there are no errors, we should publish
      !hasErrors ||
      // If there is a new url, we should publish
      hasNewUrl ||
      // If there is new metadata, we should publish
      hasNewMetadata ||
      // If there are composition errors or breaking changes, we should publish if we're forcing
      ((hasCompositionErrors || hasBreakingChanges) && forced) ||
      // If there are breaking changes, we should publish if we're accepting breaking changes
      (hasBreakingChanges && acceptBreakingChanges);

    if (shouldBePublished) {
      const messages: string[] = [];

      if (serviceUrlCheck.status === 'completed' && serviceUrlCheck.result.status === 'modified') {
        messages.push(serviceUrlCheck.result.message);
      }

      if (hasNewMetadata) {
        messages.push('Metadata has been updated');
      }

      return {
        conclusion: SchemaPublishConclusion.Publish,
        state: {
          composable: !hasErrors,
          initial: latestVersion === null,
          messages,
          changes,
          breakingChanges: breakingChanges ?? null,
          coordinatesDiff:
            diffCheck.result?.coordinatesDiff ??
            diffCheck.reason?.coordinatesDiff ??
            diffCheck.data?.coordinatesDiff ??
            null,
          compositionErrors,
          schema: incoming,
          schemas,
          supergraph: compositionCheck.result?.supergraph ?? null,
          fullSchemaSdl: compositionCheck.result?.fullSchemaSdl ?? null,
          tags: null,
          contracts: null,
        },
      };
    }

    const reasons: SchemaPublishFailureReason[] = [];

    if (compositionCheck.status === 'failed') {
      reasons.push({
        code: PublishFailureReasonCode.CompositionFailure,
        compositionErrors: compositionCheck.reason.errors,
      });
    }

    if (diffCheck.status === 'failed' && !acceptBreakingChanges) {
      reasons.push({
        code: PublishFailureReasonCode.BreakingChanges,
        changes: diffCheck.reason.all ?? [],
        breakingChanges: diffCheck.reason.breaking ?? [],
        coordinatesDiff: diffCheck.reason?.coordinatesDiff ?? null,
      });
    }

    if (metadataCheck.status === 'failed') {
      reasons.push({
        code: PublishFailureReasonCode.MetadataParsingFailure,
      });
    }

    return {
      conclusion: SchemaPublishConclusion.Reject,
      reasons,
    };
  }
}
