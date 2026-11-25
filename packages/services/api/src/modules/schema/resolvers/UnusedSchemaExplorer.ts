import { toNamedTypeMapper } from '../utils';
import type { UnusedSchemaExplorerResolvers } from './../../../__generated__/types';

export const UnusedSchemaExplorer: UnusedSchemaExplorerResolvers = {
  types: ({ types, supergraph, usage }) => {
    const unused = () =>
      ({
        isUsed: false,
        usedCoordinates: usage.usedCoordinates,
        period: usage.period,
        organizationId: usage.organizationId,
        projectId: usage.projectId,
        targetId: usage.targetId,
      }) as const;

    return types
      .map(entity => toNamedTypeMapper(entity, unused, supergraph))
      .sort((a, b) => a.entity.name.localeCompare(b.entity.name));
  },
};
