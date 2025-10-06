import { OperationsManager } from '../../operations/providers/operations-manager';
import { Logger } from '../../shared/providers/logger';
import { buildGraphQLTypesFromSDL, withUsedByClients } from '../utils';
import type { DeprecatedSchemaExplorerResolvers } from './../../../__generated__/types';

export const DeprecatedSchemaExplorer: DeprecatedSchemaExplorerResolvers = {
  types: ({ sdl, supergraph, usage }, _, { injector }) => {
    const operationsManager = injector.get(OperationsManager);

    async function getStats(typename: string) {
      const stats = await operationsManager.countCoordinatesOfTarget({
        targetId: usage.targetId,
        organizationId: usage.organizationId,
        projectId: usage.projectId,
        period: usage.period,
      });

      return withUsedByClients(stats, {
        selector: usage,
        period: usage.period,
        operationsManager,
        typename,
      });
    }

    return buildGraphQLTypesFromSDL(sdl, getStats, supergraph).sort((a, b) =>
      a.entity.name.localeCompare(b.entity.name),
    );
  },
};
