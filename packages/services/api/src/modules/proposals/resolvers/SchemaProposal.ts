// import { SchemaCheckManager } from '../../schema/providers/schema-check-manager';
import { SchemaManager } from '../../schema/providers/schema-manager';
import { toGraphQLSchemaCheckCurry } from '../../schema/to-graphql-schema-check';
import { Storage } from '../../shared/providers/storage';
import { SchemaProposalManager } from '../providers/schema-proposal-manager';
import type { SchemaProposalResolvers } from './../../../__generated__/types';

// @todo
export const SchemaProposal: SchemaProposalResolvers = {
  async author(proposal, _, { injector }) {
    if (proposal.author) {
      return proposal.author;
    }

    // @todo this feels hacky...
    const userId = (proposal as any)?.userId;
    if (userId) {
      const user = await injector.get(Storage).getUserById(userId);
      if (user?.displayName) {
        return user.displayName;
      }
    }
    return proposal.checks?.edges[0]?.node.meta?.author ?? '';
  },
  async rebasedSchemaSDL(proposal, args, { injector }) {
    if (proposal.rebasedSchemaSDL) {
      return proposal.rebasedSchemaSDL;
    }
    const target = await injector.get(Storage).getTargetById((proposal as any).targetId);
    if (!target) {
      throw new Error('uh oh');
    }

    if (target) {
      const latest = await injector.get(SchemaManager).getMaybeLatestValidVersion(target);
      if (latest) {
        const schemaChecks = await injector
          .get(SchemaManager)
          .getPaginatedSchemaChecksForSchemaProposal({
            transformNode: toGraphQLSchemaCheckCurry({
              organizationId: target.orgId,
              projectId: target.projectId,
            }),
            proposalId: proposal.id,
            cursor: args.after ?? null,
            first: args.first ?? null,
            latest: true,
          });
        const schemas = await injector.get(SchemaManager).getMaybeSchemasOfVersion(latest);
        // @todo patch schema changes onto latest
        // return {
        // edges:
        return schemaChecks.edges.map(({ node, cursor }) => {
          const schema = schemas.find(
            s =>
              (node.serviceName === '' && s.kind === 'single') ||
              (s.kind === 'composite' && s.service_name === node.serviceName),
          );
          return {
            kind: schema?.kind ?? 'composite',
            action: 'PUSH', // no idea why this is required for `__isTypeOf` in CompositeSchema.
            sdl: node.schemaSDL ?? '', // @todo patch
            id: node.id,
            service_name: node.serviceName,
            service_url: schema?.kind === 'composite' ? 'todo' : null,
            author: node.meta?.author ?? '',
            date: new Date(node.createdAt),
            commit: node.meta?.commit ?? node.id,
            metadata: node.meta ? JSON.stringify(node.meta) : undefined,
          };
        });
      }
    }
    return null;
    // @todo error if not found...
  },
  async checks(proposal, args, { injector }) {
    const target = await injector.get(Storage).getTargetById((proposal as any).targetId);
    if (!target) {
      throw new Error('oops');
    }
    const schemaChecks = await injector
      .get(SchemaManager)
      .getPaginatedSchemaChecksForSchemaProposal({
        transformNode: toGraphQLSchemaCheckCurry({
          organizationId: target.orgId,
          projectId: target.projectId,
        }),
        proposalId: proposal.id,
        cursor: args.after ?? null,
        first: args.first ?? null,
        latest: args.input.latestPerService ?? false,
      });
    return schemaChecks;
  },
  async rebasedSupergraphSDL(proposal, args) {
    // @todo
    console.log(proposal.id, args);
    return '';
  },
  async reviews(proposal, args, { injector }) {
    // @todo
    await injector.get(SchemaProposalManager).getPaginatedReviews({
      proposalId: proposal.id,
      after: args.after ?? '',
      first: args.first,
      stages: [], // @todo
      authors: [], // @todo
    });
    return proposal.reviews ?? null;
  },
};
