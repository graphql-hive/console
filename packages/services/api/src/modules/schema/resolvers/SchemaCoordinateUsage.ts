import { OperationsManager } from '../../operations/providers/operations-manager';
import type { SchemaCoordinateUsageResolvers } from './../../../__generated__/types';

export const SchemaCoordinateUsage: SchemaCoordinateUsageResolvers = {
  topOperations: (source, { limit }, { injector }) => {
    if (!source.isUsed) {
      return [];
    }

    return injector
      .get(OperationsManager)
      .getTopOperationForCoordinate({
        organizationId: source.organizationId,
        projectId: source.projectId,
        targetId: source.targetId,
        coordinate: source.coordinate,
        period: source.period,
        limit,
      })
      .then(operations =>
        operations.map(op => ({
          name: op.operationName,
          hash: op.operationHash,
          count: op.count,
        })),
      );
  },
  // Why? GraphQL-JIT goes crazy without this (Expected Iterable, but did not find one for field SchemaCoordinateUsage.usedByClients).
  // That's why we switched from a getter to a function.
  usedByClients: parent => {
    return parent.usedByClients();
  },
};
