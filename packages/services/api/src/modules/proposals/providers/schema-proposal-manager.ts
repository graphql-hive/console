/**
 * This wraps the higher level logic with schema proposals.
 */
import { SchemaProposalChangeDetailsMapper } from '../module.graphql.mappers';
import DataLoader from 'dataloader';
import { Inject, Injectable, Scope } from 'graphql-modules';
import type { TargetReferenceInput } from 'packages/libraries/core/src/client/__generated__/types';
import { isChangeEqual } from '@graphql-inspector/compare-changes';
import { Change } from '@graphql-inspector/core';
import { traceFn } from '@hive/service-common';
import { SchemaChangeType } from '@hive/storage';
import type { SchemaProposalStage } from '../../../__generated__/types';
import { HiveError } from '../../../shared/errors';
import { cache } from '../../../shared/helpers';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { PUB_SUB_CONFIG, type HivePubSub } from '../../shared/providers/pub-sub';
import { Storage } from '../../shared/providers/storage';
import { SchemaProposalStorage } from './schema-proposal-storage';

type ChangeSelector = {
  targetId: string;
  change: SchemaChangeType;
};

@Injectable({
  scope: Scope.Operation,
})
export class SchemaProposalManager {
  private logger: Logger;
  private approvedChangeProposalLoader: DataLoader<
    ChangeSelector,
    SchemaProposalChangeDetailsMapper
  >;

  constructor(
    logger: Logger,
    private proposalStorage: SchemaProposalStorage,
    private storage: Storage,
    private session: Session,
    private idTranslator: IdTranslator,
    @Inject(PUB_SUB_CONFIG) private pubSub: HivePubSub,
  ) {
    this.logger = logger.child({ source: 'SchemaProposalsManager' });

    const cacheKeyFn = function (selector: ChangeSelector) {
      return `${selector.targetId}/${selector.change.id}`;
    };
    this.approvedChangeProposalLoader = new DataLoader(
      async selectors => {
        // map the list of keys in the order in which they are passed in so it can
        // be mapped back to.
        const keys = selectors.map(cacheKeyFn);

        // combine selectors by targetId
        const groupedSelectors = selectors.reduce((groups, selector) => {
          const group = groups.get(selector.targetId);
          if (!group) {
            groups.set(selector.targetId, [selector.change]);
          } else {
            group.push(selector.change);
          }
          return groups;
        }, new Map<string, SchemaChangeType[]>());

        // fetch the groups
        const approvedProposedChangesByCacheId = await Promise.all(
          Array.from(groupedSelectors.entries()).map(async ([targetId, changes]) => {
            const result = await this.proposalStorage.getEquivalentUnimplementedApprovedChanges({
              changes: changes as unknown as Change<any>[],
              targetId,
            });
            const entries = result
              .map((apc, i) => {
                if (apc) {
                  return [cacheKeyFn({ change: changes[i], targetId }), apc] as const;
                }
              })
              .filter(e => e !== undefined);
            return Object.fromEntries(entries);
          }),
        );

        // map back to the original selectors
        return keys.map((cacheKey): SchemaProposalChangeDetailsMapper => {
          for (const targetChangesByCacheId of approvedProposedChangesByCacheId) {
            const approvedRecord = targetChangesByCacheId[cacheKey];
            if (approvedRecord) {
              return {
                schemaProposal: {
                  id: approvedRecord.proposalId,
                },
                implementedBy: approvedRecord.schemaVersionId
                  ? {
                      id: approvedRecord.schemaVersionId,
                    }
                  : null,
              };
            }
          }
          return null;
        });
      },
      {
        cacheKeyFn,
      },
    );
  }

  async subscribeToSchemaProposalCompositions(args: { proposalId: string }) {
    const proposal = await this.proposalStorage.getProposalTargetId({
      id: args.proposalId,
    });

    if (!proposal) {
      this.session.raise('schemaProposal:describe');
    }

    const selector = await this.idTranslator.resolveTargetReference({
      reference: {
        byId: proposal.targetId,
      },
    });

    if (!selector) {
      this.session.raise('schemaProposal:describe');
    }

    await this.session.assertPerformAction({
      organizationId: selector.organizationId,
      action: 'schemaProposal:describe',
      params: selector,
    });

    this.logger.info(`Subscribed to "schemaProposalComposition" (id=${args.proposalId})`);

    return this.pubSub.subscribe('schemaProposalComposition', args.proposalId);
  }

  async proposeSchema(args: {
    target: TargetReferenceInput;
    title: string;
    description: string;
    isDraft: boolean;
    author: string;
  }) {
    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });
    if (selector === null) {
      this.session.raise('schemaProposal:modify');
    }

    await this.session.assertPerformAction({
      action: 'schemaProposal:modify',
      organizationId: selector.organizationId,
      params: selector,
    });

    const createProposalResult = await this.proposalStorage.createProposal({
      organizationId: selector.organizationId,
      author: args.author ?? null,
      description: args.description,
      stage: args.isDraft ? 'DRAFT' : 'OPEN',
      targetId: selector.targetId,
      title: args.title,
    });

    if (createProposalResult.type === 'error') {
      return createProposalResult;
    }

    const proposal = createProposalResult.proposal;
    return {
      type: 'ok' as const,
      schemaProposal: {
        title: proposal.title,
        description: proposal.description,
        id: proposal.id,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        stage: proposal.stage,
        targetId: proposal.targetId,
        reviews: null,
        author: args.author,
        checks: {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: '',
            endCursor: '',
          },
        },
      },
    };
  }

  @cache<{ id: string }>(({ id }) => id)
  async getProposal(args: { id: string }) {
    const proposal = await this.proposalStorage.getProposal(args);

    if (proposal) {
      const selector = await this.idTranslator.resolveTargetReference({
        reference: {
          byId: proposal.targetId,
        },
      });
      if (selector === null) {
        this.session.raise('schemaProposal:describe');
      }
      await this.session.assertPerformAction({
        action: 'schemaProposal:describe',
        organizationId: selector.organizationId,
        params: selector,
      });
    }
    return proposal;
  }

  async getPaginatedReviews(args: {
    proposalId: string;
    first: number;
    after: string;
    stages: SchemaProposalStage[];
    authors: string[];
  }) {
    this.logger.debug('Get paginated reviews (target=%s, after=%s)', args.proposalId, args.after);
    const proposal = await this.proposalStorage.getProposalTargetId({ id: args.proposalId });

    if (proposal) {
      const selector = await this.idTranslator.resolveTargetReference({
        reference: {
          byId: proposal.targetId,
        },
      });
      if (selector === null) {
        this.session.raise('schemaProposal:describe');
      }
      await this.session.assertPerformAction({
        action: 'schemaProposal:describe',
        organizationId: selector.organizationId,
        params: selector,
      });
    }

    return this.proposalStorage.getPaginatedReviews(args);
  }

  async getPaginatedProposals(args: {
    target: TargetReferenceInput;
    first: number;
    after: string;
    stages: ReadonlyArray<SchemaProposalStage>;
  }) {
    this.logger.debug(
      'Get paginated proposals (target=%s, after=%s, stages=%s)',
      args.target.bySelector?.targetSlug || args.target.byId,
      args.after,
      args.stages.join(','),
    );
    const selector = await this.idTranslator.resolveTargetReference({
      reference: args.target,
    });
    if (selector === null) {
      this.session.raise('schemaProposal:describe');
    }

    await this.session.assertPerformAction({
      action: 'schemaProposal:describe',
      organizationId: selector.organizationId,
      params: selector,
    });

    return this.proposalStorage.getPaginatedProposals({
      targetId: selector.targetId,
      after: args.after,
      first: args.first,
      stages: args.stages,
    });
  }

  async reviewProposal(args: {
    proposalId: string;
    stage: SchemaProposalStage | null;
    body: string | null;
    serviceName: string;
  }) {
    this.logger.debug(`Reviewing proposal (proposal=%s, stage=%s)`, args.proposalId, args.stage);

    const proposal = await this.proposalStorage.getProposalTargetId({ id: args.proposalId });

    if (!proposal) {
      throw new HiveError('Proposal target lookup failed.');
    }

    const user = await this.session.getViewer();
    const target = await this.storage.getTargetById(proposal.targetId);

    if (!target) {
      throw new HiveError('Proposal target lookup failed.');
    }

    await this.session.assertPerformAction({
      action: 'schemaProposal:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: proposal.targetId,
      },
    });

    if (args.stage) {
      const review = await this.proposalStorage.manuallyTransitionProposal({
        organizationId: target.orgId,
        targetId: proposal.targetId,
        id: args.proposalId,
        stage: args.stage,
        author: user.displayName,
        serviceName: args.serviceName,
      });

      if (review.type === 'error') {
        return review;
      }

      return {
        ...review,
        review: {
          ...review.review,
          author: user.displayName,
        },
      };
    }

    throw new HiveError('Not implemented');
  }

  @traceFn('SchemaProposalManager._getImplementedVersionsByProposalId', {
    initAttributes: input => ({
      'hive.schema_proposal.id': input.schemaProposalId || '',
      'hive.target.id': input.targetId,
    }),
    resultAttributes: result => ({
      'hive.proposals.details.length': result?.length || 0,
    }),
  })
  @cache<{
    schemaProposalId: string;
    targetId: string;
  }>(({ schemaProposalId, targetId }) => `${targetId}/${schemaProposalId}`)
  async _getImplementedVersionsByProposalId(args: { schemaProposalId: string; targetId: string }) {
    return this.proposalStorage.getImplementedVersionsByProposalId({
      schemaProposalId: args.schemaProposalId,
      targetId: args.targetId,
    });
  }

  @traceFn('SchemaProposalManager._getImplementedVersionsBySchemaVersionId', {
    initAttributes: input => ({
      'hive.schema_proposal.id': input.schemaVersionId,
      'hive.target.id': input.targetId,
    }),
    resultAttributes: result => ({
      'hive.proposals.details.length': result?.length || 0,
    }),
  })
  @cache<{
    schemaVersionId: string;
    targetId: string;
  }>(({ schemaVersionId, targetId }) => `${targetId}/${schemaVersionId}`)
  async _getImplementedVersionsBySchemaVersionId(args: {
    schemaVersionId: string;
    targetId: string;
  }) {
    return this.proposalStorage.getImplementedApprovedChangesByVersionId({
      schemaVersionId: args.schemaVersionId,
      targetId: args.targetId,
    });
  }

  /**
   * If dealing with a non-schema proposal related check or schema version,
   * then this function can search to find if any of the check's or historic changes
   * are matches for approved schema proposal changes.
   *
   * Note that if you need the ChangeDetails object for a schema proposal's changes, then use
   * `getProposalChangeDetails`.
   **/
  async getMatchingApprovedProposalChangeDetails({
    targetId,
    change,
  }: {
    targetId: string;
    change: SchemaChangeType;
  }) {
    return this.approvedChangeProposalLoader.load({ targetId, change });
  }

  /**
   * Schema proposals use checks under the hood which makes this a bit confusing.
   * This function is for finding `proposalChangeDetails` for a schema proposal's
   * associated check's changes -- effectively the proposed changes.
   */
  async getProposalChangeDetails({
    schemaProposalId,
    targetId,
    change,
  }: {
    targetId: string;

    // The ID of the schema proposal that is proposing this change
    schemaProposalId: string;

    // The change record. Used to compare against the returned implemented change
    // to verify that they are equal.
    change: SchemaChangeType;
  }) {
    // `_getImplementedVersionsByProposalId` is cached so it's safe to call multiple times.
    // This is intended to be used by the SchemaChange resolver and would be called on every
    // SchemaChange.
    const implementedChanges = await this._getImplementedVersionsByProposalId({
      schemaProposalId,
      targetId,
    });

    // Verify which versions implement the associated changes using an exact compare
    const implementation = implementedChanges.find(
      implementedChange =>
        isChangeEqual(
          implementedChange.change as unknown as Change<any>,
          change as unknown as Change<any>,
        ) && implementedChange.schemaVersionId,
    );

    return {
      schemaProposal: { id: schemaProposalId },
      implementedBy: implementation?.schemaVersionId
        ? {
            id: implementation.schemaVersionId,
          }
        : null,
    };
  }

  async getImplementedVersionsBySchemaVersionId({
    targetId,
    schemaVersionId,
    change,
  }: {
    targetId: string;
    schemaVersionId: string;

    // The change record. Used to compare against the returned implemented change
    // to verify that they are equal.
    change: SchemaChangeType;
  }) {
    // `_getImplementedVersionsBySchemaVersionId` is cached so it's safe to call multiple times.
    // This is intended to be used by the SchemaChange resolver and would be called on every
    // SchemaChange.
    const implementedChanges = await this._getImplementedVersionsBySchemaVersionId({
      targetId,
      schemaVersionId,
    });

    // Verify which versions implement the associated changes using an exact compare
    const implementation = implementedChanges.find(
      (
        implementedChange,
      ): implementedChange is typeof implementedChange & { schemaVersionId: string } =>
        isChangeEqual(
          implementedChange.change as unknown as Change<any>,
          change as unknown as Change<any>,
        ) && !!implementedChange.schemaVersionId,
    );
    if (implementation) {
      return {
        schemaProposal: { id: implementation.proposalId },
        implementedBy: {
          id: implementation.schemaVersionId,
        },
      };
    }
    return null;
  }
}
