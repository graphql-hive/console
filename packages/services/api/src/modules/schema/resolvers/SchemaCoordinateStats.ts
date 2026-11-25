import { GraphStore } from '../../graph/providers/graph-store';
import { SchemaManager } from '../providers/schema-manager';
import { SchemaVersionHelper } from '../providers/schema-version-helper';
import type { SchemaCoordinateStatsResolvers } from './../../../__generated__/types';

export const SchemaCoordinateStats: Pick<SchemaCoordinateStatsResolvers, 'supergraphMetadata'> = {
  supergraphMetadata: async ({ target, schemaCoordinate }, _, { injector }) => {
    // Usage can arrive with no composable version: nothing published yet, or every publish failed.
    const graph = await injector.get(GraphStore).getDefaultGraphForTargetId(target);
    const latestVersion = await injector
      .get(SchemaManager)
      // Owners come from the explorer snapshot, metadata from the version: no SDL needed.
      .getMaybeLatestValidVersionForGraph(graph, { withSDL: false });
    if (!latestVersion) {
      return null;
    }
    const snapshot = await injector.get(SchemaVersionHelper).getExplorerSnapshot(latestVersion);
    const ownedByServiceNames = snapshot?.getOwnedBy(schemaCoordinate);

    return {
      __typename: 'SupergraphMetadata',
      metadata: latestVersion.schemaMetadata?.[schemaCoordinate]?.map(m => ({
        ...m,
        __typename: 'SchemaMetadata',
      })),
      ownedByServiceNames,
    };
  },
};
