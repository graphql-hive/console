import { Injectable, Scope } from 'graphql-modules';
import { SingleOrchestrator } from '../orchestrators/single';
import { RegistryChecks } from '../registry-checks';
import type { PublishInput } from '../schema-publisher';
import type { Project, SingleSchema, Target } from './../../../../shared/entities';
import { Logger } from './../../../shared/providers/logger';
import {
  CheckFailureReasonCode,
  PublishFailureReasonCode,
  PublishIgnoreReasonCode,
  /* Check */
  SchemaCheckConclusion,
  SchemaCheckFailureReason,
  SchemaCheckResult,
  /* Publish */
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
    project,
    baseSchema,
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
      schemas: [SingleSchema];
    } | null;
    baseSchema: string | null;
    project: Project;
  }): Promise<SchemaCheckResult> {
    const incoming: SingleSchema = {
      kind: 'single',
      id: temp,
      author: temp,
      commit: temp,
      target: selector.target,
      date: Date.now() as any,
      sdl: input.sdl,
      metadata: null,
    };

    const initial = latest === null;
    const latestVersion = latest;
    const schemas = [incoming] as [SingleSchema];

    const checksumCheck = await this.checks.checksum({
      schemas,
      latestVersion,
    });

    // Short-circuit if there are no changes
    if (checksumCheck.status === 'completed' && checksumCheck.result === 'unchanged') {
      this.logger.debug('No changes detected, skipping schema check');
      return {
        conclusion: SchemaCheckConclusion.Success,
        state: {
          changes: null,
          initial,
        },
      };
    }

    const [compositionCheck, diffCheck] = await Promise.all([
      this.checks.composition({
        orchestrator: this.orchestrator,
        project,
        schemas,
        baseSchema,
      }),
      this.checks.diff({
        orchestrator: this.orchestrator,
        project,
        schemas,
        selector,
        latestVersion,
      }),
    ]);

    if (compositionCheck.status === 'failed' || diffCheck.status === 'failed') {
      const reasons: SchemaCheckFailureReason[] = [];

      if (compositionCheck.status === 'failed') {
        this.logger.debug('Failing schema check due to composition errors');
        reasons.push({
          code: CheckFailureReasonCode.CompositionFailure,
          compositionErrors: compositionCheck.reason.errors,
        });
      }

      if (diffCheck.status === 'failed') {
        this.logger.debug('Failing schema check due to breaking changes');
        reasons.push({
          code: CheckFailureReasonCode.BreakingChanges,
          changes: diffCheck.reason.changes ?? [],
          breakingChanges: diffCheck.reason.breakingChanges,
        });
      }

      return {
        conclusion: SchemaCheckConclusion.Failure,
        reasons,
      };
    }

    return {
      conclusion: SchemaCheckConclusion.Success,
      state: {
        changes: diffCheck.result?.changes ?? null,
        initial,
      },
    };
  }

  async publish({
    input,
    target,
    latest,
    project,
    baseSchema,
  }: {
    input: PublishInput;
    project: Project;
    target: Target;
    latest: {
      isComposable: boolean;
      schemas: [SingleSchema];
    } | null;
    baseSchema: string | null;
  }): Promise<SchemaPublishResult> {
    const incoming: SingleSchema = {
      kind: 'single',
      id: temp,
      author: input.author,
      sdl: input.sdl,
      commit: input.commit,
      target: target.id,
      date: Date.now() as any,
      metadata: input.metadata ?? null,
    };

    const latestVersion = latest;
    const schemas = [incoming] as [SingleSchema];

    const checksumCheck = await this.checks.checksum({
      schemas,
      latestVersion,
    });

    // Short-circuit if there are no changes
    if (checksumCheck.status === 'completed' && checksumCheck.result === 'unchanged') {
      return {
        conclusion: SchemaPublishConclusion.Ignore,
        reason: PublishIgnoreReasonCode.NoChanges,
      };
    }

    const [compositionCheck, metadataCheck] = await Promise.all([
      this.checks.composition({
        orchestrator: this.orchestrator,
        project,
        baseSchema,
        schemas: [
          baseSchema
            ? {
                ...incoming,
                sdl: baseSchema + ' ' + incoming.sdl,
              }
            : incoming,
        ],
      }),
      this.checks.metadata(incoming, latestVersion ? latestVersion.schemas[0] : null),
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

    return {
      conclusion: SchemaPublishConclusion.Publish,
      state: {
        composable: compositionCheck.status === 'completed',
        initial: latestVersion === null,
        changes: null,
        messages,
        breakingChanges: null,
        compositionErrors: null,
        schema: incoming,
        schemas,
        orchestrator: this.orchestrator,
      },
    };
  }
}
