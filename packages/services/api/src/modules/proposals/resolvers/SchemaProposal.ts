import { invariant } from '@hive/service-common';
import type { Schema } from '../../../shared/entities';
import { GraphStore } from '../../graph/providers/graph-store';
import { SchemaManager } from '../../schema/providers/schema-manager';
import { toGraphQLSchemaCheckCurry } from '../../schema/to-graphql-schema-check';
import { TargetStore } from '../../target/providers/target-store';
import { SchemaProposalManager } from '../providers/schema-proposal-manager';
import type { SchemaProposalResolvers } from './../../../__generated__/types';

export const SchemaProposal: SchemaProposalResolvers = {
  async author(proposal) {
    if (proposal.author) {
      return proposal.author;
    }
    return proposal.checks?.edges[0]?.node.meta?.author ?? '';
  },
  async rebasedSchemaSDL(proposal, args, { injector }) {
    if (proposal.rebasedSchemaSDL) {
      return proposal.rebasedSchemaSDL;
    }
    const target = await injector.get(TargetStore).getTargetById((proposal as any).targetId);
    if (!target) {
      throw new Error('uh oh');
    }

    const graph = await injector.get(GraphStore).findGraphForTargetIdByName(target.id, 'default');
    invariant(graph, "No graph with name 'default' exists.");

    if (target) {
      const latest = await injector.get(SchemaManager).getMaybeLatestValidVersionForGraph(graph);
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
        return schemaChecks.edges.map(({ node, cursor: _ }): Schema => {
          const schema = schemas.find(
            s =>
              (!node.serviceName && s.kind === 'single') ||
              (s.kind === 'composite' && s.service_name === node.serviceName),
          );

          return {
            kind: schema?.kind ?? 'composite',
            type: schema?.type ?? 'FEDERATION',
            action: 'PUSH', // no idea why this is required for `__isTypeOf` in CompositeSchema.
            sdl: node.schemaSDL ?? '', // @todo patch schema changes onto latest
            id: node.id,
            service_name: node.serviceName ?? '',
            service_url:
              node.serviceUrl ?? (schema?.kind === 'composite' ? schema.service_url : '') ?? '',
            author: node.meta?.author ?? '',
            date: new Date(node.createdAt).getTime(),
            commit: node.meta?.commit ?? node.id,
            metadata: node.meta ? JSON.stringify(node.meta) : null,
          } as Schema;
        });
      }
    }
    throw new Error('Something went wrong.');
  },
  async checks(proposal, args, { injector }) {
    const target = await injector.get(TargetStore).getTargetById((proposal as any).targetId);
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
