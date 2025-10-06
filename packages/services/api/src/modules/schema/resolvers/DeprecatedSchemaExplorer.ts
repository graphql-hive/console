import { OperationsManager } from '../../operations/providers/operations-manager';
import { buildGraphQLTypesFromSDL, withUsedByClients } from '../utils';
import type { DeprecatedSchemaExplorerResolvers } from './../../../__generated__/types';

function memo<R, A, K>(fn: (arg: A) => R, cacheKeyFn: (arg: A) => K): (arg: A) => R {
  let memoizedResult: R | null = null;
  let memoizedKey: K | null = null;

  return (arg: A) => {
    const currentKey = cacheKeyFn(arg);
    if (memoizedKey === currentKey) {
      return memoizedResult!;
    }

    memoizedKey = currentKey;
    memoizedResult = fn(arg);

    return memoizedResult;
  };
}

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
