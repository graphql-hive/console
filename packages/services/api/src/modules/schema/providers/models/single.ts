import { Injectable, Scope } from 'graphql-modules';
import { SchemaChangeType } from '@hive/storage';
import { SingleOrchestrator } from '../orchestrators/single';
import { ConditionalBreakingChangeDiffConfig, RegistryChecks } from '../registry-checks';
import type { PublishInput } from '../schema-publisher';
import type { Organization, Project, SingleSchema, Target } from './../../../../shared/entities';
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
    private orchestrator: SingleOrchestrator,
    private checks: RegistryChecks,
    private logger: Logger,
  ) {}

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
  }: {
    input: {
      sdl: string;
    };
    selector: {
      organization: string;
      project: string;
      target: string;
    };
    latest: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchema];
    } | null;
    latestComposable: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchema];
    } | null;
    baseSchema: string | null;
    project: Project;
    organization: Organization;
    approvedChanges: Map<string, SchemaChangeType>;
    conditionalBreakingChangeDiffConfig: null | ConditionalBreakingChangeDiffConfig;
  }): Promise<SchemaCheckResult> {
    const incoming: SingleSchema = {
      kind: 'single',
      id: temp,
      author: temp,
      commit: temp,
      target: selector.target,
      date: Date.now(),
      sdl: input.sdl,
      metadata: null,
    };

    const schemas = [incoming] as [SingleSchema];
    const compareToPreviousComposableVersion =
      organization.featureFlags.compareToPreviousComposableVersion;
    const comparedVersion = compareToPreviousComposableVersion ? latestComposable : latest;

    const checksumResult = await this.checks.checksum({
      existing: comparedVersion
        ? {
            schemas: comparedVersion.schemas,
            contractNames: null,
          }
        : null,
      incoming: {
        schemas,
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
      orchestrator: this.orchestrator,
      targetId: selector.target,
      project,
      organization,
      schemas,
      baseSchema,
      contracts: null,
    });

    const previousVersionSdl = await this.checks.retrievePreviousVersionSdl({
      orchestrator: this.orchestrator,
      version: comparedVersion,
      organization,
      project,
      targetId: selector.target,
    });

    const [diffCheck, policyCheck] = await Promise.all([
      this.checks.diff({
        conditionalBreakingChangeConfig: conditionalBreakingChangeDiffConfig,
        includeUrlChanges: false,
        filterOutFederationChanges: false,
        approvedChanges,
        existingSdl: previousVersionSdl,
        incomingSdl: compositionCheck.result?.fullSchemaSdl ?? null,
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
  }: {
    input: PublishInput;
    organization: Organization;
    project: Project;
    target: Target;
    latest: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchema];
    } | null;
    latestComposable: {
      isComposable: boolean;
      sdl: string | null;
      schemas: [SingleSchema];
    } | null;
    baseSchema: string | null;
    conditionalBreakingChangeDiffConfig: null | ConditionalBreakingChangeDiffConfig;
  }): Promise<SchemaPublishResult> {
    const incoming: SingleSchema = {
      kind: 'single',
      id: temp,
      author: input.author,
      sdl: input.sdl,
      commit: input.commit,
      target: target.id,
      date: Date.now(),
      metadata: input.metadata ?? null,
    };

    const latestVersion = latest;
    const schemas = [incoming] as [SingleSchema];
    const compareToPreviousComposableVersion =
      organization.featureFlags.compareToPreviousComposableVersion;
    const comparedVersion = compareToPreviousComposableVersion ? latestComposable : latest;

    const checksumCheck = await this.checks.checksum({
      existing: comparedVersion
        ? {
            schemas: comparedVersion.schemas,
            contractNames: null,
          }
        : null,
      incoming: {
        schemas,
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
      orchestrator: this.orchestrator,
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
      orchestrator: this.orchestrator,
      version: comparedVersion,
      organization,
      project,
      targetId: target.id,
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
        compositionErrors: compositionCheck.reason?.errors ?? null,
        schema: incoming,
        schemas,
        supergraph: null,
        fullSchemaSdl: compositionCheck.result?.fullSchemaSdl ?? null,
        tags: compositionCheck.result?.tags ?? null,
        contracts: null,
      },
    };
  }
}
