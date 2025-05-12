import { extractSuperGraphInformation } from '../lib/federation-super-graph';
import { SchemaManager } from '../providers/schema-manager';
import { SchemaVersionHelper } from '../providers/schema-version-helper';
import type { SchemaCoordinateStatsResolvers } from './../../../__generated__/types';

export const SchemaCoordinateStats: Pick<
  SchemaCoordinateStatsResolvers,
  'supergraphMetadata' | '__isTypeOf'
> = {
  supergraphMetadata: async (
    { organization, project, target, schemaCoordinate },
    _,
    { injector },
  ) => {
    // @note: SchemaManager.getLatestValidVersion uses DataLoader to avoid multiple fetches per operation
    const latestVersion = await injector.get(SchemaManager).getLatestValidVersion({
      targetId: target,
      projectId: project,
      organizationId: organization,
    });
    // @note: `SchemaVersionHelper.getSupergraphAst` is cached
    const supergraphAst = await injector.get(SchemaVersionHelper).getSupergraphAst(latestVersion);
    const supergraph = supergraphAst ? extractSuperGraphInformation(supergraphAst) : null;
    supergraph?.schemaCoordinateServicesMappings;

    return {
      __typename: 'SupergraphMetadata',
      metadata: latestVersion.schemaMetadata?.[schemaCoordinate]?.map(m => ({
        ...m,
        __typename: 'SchemaMetadata',
      })),
      ownedByServiceNames: supergraph?.schemaCoordinateServicesMappings.get(schemaCoordinate),
    };
  },
};
