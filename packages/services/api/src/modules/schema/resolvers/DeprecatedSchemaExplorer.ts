import { OperationsManager } from '../../operations/providers/operations-manager';
import { buildGraphQLTypesFromSDL, memo, withUsedByClients } from '../utils';
import type { DeprecatedSchemaExplorerResolvers } from './../../../__generated__/types';

export const DeprecatedSchemaExplorer: DeprecatedSchemaExplorerResolvers = {
  types: ({ sdl, supergraph, usage }, _, { injector }) => {
    const operationsManager = injector.get(OperationsManager);

    // NOTE: this function is super heavy.
    const getStats = memo(
      async function _getStats(typename: string) {
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
      },
      arg => arg,
    );

    return buildGraphQLTypesFromSDL(sdl, getStats, supergraph).sort((a, b) =>
      a.entity.name.localeCompare(b.entity.name),
    );
  },
};
