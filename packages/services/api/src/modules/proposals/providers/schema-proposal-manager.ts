/**
 * This wraps the higher level logic with schema proposals.
 */
import { Injectable, Scope } from 'graphql-modules';
import { TargetReferenceInput } from 'packages/libraries/core/src/client/__generated__/types';
import { SchemaChangeType } from '@hive/storage';
import { SchemaProposalCheckInput, SchemaProposalStage } from '../../../__generated__/types';
import { Session } from '../../auth/lib/authz';
import { SchemaPublisher } from '../../schema/providers/schema-publisher';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { SchemaProposalStorage } from './schema-proposal-storage';

@Injectable({
  scope: Scope.Operation,
})
export class SchemaProposalManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: SchemaProposalStorage,
    private session: Session,
    private idTranslator: IdTranslator,
    private schemaPublisher: SchemaPublisher,
  ) {
    this.logger = logger.child({ source: 'SchemaProposalsManager' });
  }

  async proposeSchema(args: {
    target: TargetReferenceInput;
    title: string;
    description: string;
    isDraft: boolean;
    user: {
      id: string;
      displayName: string;
    };
    initialChecks: ReadonlyArray<SchemaProposalCheckInput>;
  }) {
    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });
    if (selector === null) {
      this.session.raise('schemaProposal:modify');
    }

    const createProposalResult = await this.storage.createProposal({
      organizationId: selector.organizationId,
      userId: args.user.id,
      description: args.description,
      stage: args.isDraft ? 'DRAFT' : 'OPEN',
      targetId: selector.targetId,
      title: args.title,
    });

    if (createProposalResult.type === 'error') {
      return createProposalResult;
    }

    const proposal = createProposalResult.proposal;
    const changes: SchemaChangeType[] = [];
    const checkPromises = args.initialChecks.map(async check => {
      const result = await this.schemaPublisher.check({
        ...check,
        service: check.service?.toLowerCase(),
        target: { byId: selector.targetId },
        schemaProposalId: proposal.id,
      });
      if ('changes' in result && result.changes) {
        changes.push(...result.changes);
        return {
          ...result,
          changes: result.changes,
          errors:
            result.errors?.map(error => ({
              ...error,
              path: 'path' in error ? error.path?.split('.') : null,
            })) ?? [],
        };
      }
    });

    // @todo handle errors... rollback?
    const checks = await Promise.all(checkPromises);

    // @todo consider mapping this here vs using the nested resolver... This is more efficient but riskier bc logic lives in two places.
    // const checkEdges = checks.map(check => ({
    //   node: check,
    //   cursor: 'schemaCheck' in check && encodeCreatedAtAndUUIDIdBasedCursor({ id: check.schemaCheck!.id, createdAt: check.schemaCheck!.createdAt} ) || undefined,
    // })) as any; // @todo
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
        author: args.user.displayName,
        commentsCount: 0,
        // checks: {
        //   edges: checkEdges,
        //   pageInfo: {
        //     hasNextPage: false,
        //     hasPreviousPage: false,
        //     startCursor: checkEdges[0]?.cursor || '',
        //     endCursor: checkEdges[checkEdges.length -1]?.cursor || '',
        //   },
        // },
        // rebasedSchemaSDL(checkId: ID): [SubgraphSchema!]
        // rebasedSupergraphSDL(versionId: ID): String
      },
    };
  }

  async getProposal(args: { proposalId: string }) {
    return this.storage.getProposal(args);
  }

  async getPaginatedReviews(args: { proposalId: string; first: number; after: string }) {
    this.logger.debug('Get paginated reviews (target=%s, after=%s)', args.proposalId, args.after);

    return this.storage.getPaginatedReviews(args);
  }

  async getPaginatedProposals(args: {
    target: TargetReferenceInput;
    first: number;
    after: string;
    stages: ReadonlyArray<SchemaProposalStage>;
    users: string[];
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
      this.session.raise('schemaProposal:modify');
    }

    return this.storage.getPaginatedProposals({
      targetId: selector.targetId,
      after: args.after,
      first: args.first,
      stages: args.stages,
      users: [],
    });
  }

  async reviewProposal(args: { proposalId: string }) {}
}
