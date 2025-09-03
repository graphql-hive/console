import { SchemaCheckManager } from '../../schema/providers/schema-check-manager';
import { SchemaManager } from '../../schema/providers/schema-manager';
import { toGraphQLSchemaCheckCurry } from '../../schema/to-graphql-schema-check';
import { Storage } from '../../shared/providers/storage';
import { SchemaProposalManager } from '../providers/schema-proposal-manager';
import type { SchemaProposalResolvers } from './../../../__generated__/types';

// @todo
export const SchemaProposal: SchemaProposalResolvers = {
  async author(proposal, _, { injector }) {
    const userId = (proposal as any)?.userId;
    if (userId) {
      const user = await injector.get(Storage).getUserById(userId);
      return user?.displayName ?? '';
    }
    return '';
  },
  async rebasedSchemaSDL(proposal, args, { injector }) {
    if (proposal.rebasedSchemaSDL) {
      return proposal.rebasedSchemaSDL;
    }
    const target = await injector.get(Storage).getTargetById((proposal as any).targetId);
    if (!target) {
      throw new Error('uh oh');
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
        latest: true,
      });

    if (target) {
      const latest = await injector.get(SchemaManager).getMaybeLatestValidVersion(target);
      if (latest) {
        const schemas = await injector.get(SchemaManager).getMaybeSchemasOfVersion(latest);
        return {
          edges: schemaChecks.edges.map(({ node, cursor }) => {
            const schema = schemas.find(
              s =>
                (node.serviceName === '' && s.kind === 'single') ||
                (s.kind === 'composite' && s.service_name === node.serviceName),
            );
            return {
              node: {
                schemaSDL: schema?.sdl ?? '', // @todo patch
                serviceName: node.serviceName,
              },
              cursor,
            };
          }),
          pageInfo: schemaChecks.pageInfo,
        };
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
  async rebasedSupergraphSDL(proposal, args, { injector }) {
    return '';
  },
  async reviews(proposal, args, { injector }) {
    injector.get(SchemaProposalManager).getPaginatedReviews({
      proposalId: proposal.id,
      after: args.after ?? '',
      first: args.first,
    });
    return proposal.reviews ?? null;
  },
};
