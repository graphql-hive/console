/**
 * This wraps the higher level logic with schema proposals.
 */
import { Inject, Injectable, Scope } from 'graphql-modules';
import { TargetReferenceInput } from 'packages/libraries/core/src/client/__generated__/types';
import type { SchemaProposalStage } from '../../../__generated__/types';
import { HiveError } from '../../../shared/errors';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { PUB_SUB_CONFIG, type HivePubSub } from '../../shared/providers/pub-sub';
import { Storage } from '../../shared/providers/storage';
import { SchemaProposalStorage } from './schema-proposal-storage';

@Injectable({
  scope: Scope.Operation,
})
export class SchemaProposalManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private proposalStorage: SchemaProposalStorage,
    private storage: Storage,
    private session: Session,
    private idTranslator: IdTranslator,
    @Inject(PUB_SUB_CONFIG) private pubSub: HivePubSub,
  ) {
    this.logger = logger.child({ source: 'SchemaProposalsManager' });
  }

  async subscribeToSchemaProposalCompositions(args: { proposalId: string }) {
    const proposal = await this.proposalStorage.getProposal({
      id: args.proposalId,
    });

    if (!proposal) {
      throw new HiveError('Proposal not found.');
    }

    const selector = await this.idTranslator.resolveTargetReference({
      reference: {
        byId: proposal.targetId,
      },
    });

    if (!selector) {
      throw new HiveError('Proposal not found.');
    }

    await this.session.assertPerformAction({
      organizationId: selector.organizationId,
      action: 'schemaProposal:describe',
      params: selector,
    });

    return this.pubSub.subscribe('schemaProposalComposition', proposal.id);
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
}
