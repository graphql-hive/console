import { AppDeploymentsManager } from '../../app-deployments/providers/app-deployments-manager';
import type { SchemaChangeAffectedAppDeploymentResolvers } from './../../../__generated__/types';

export const SchemaChangeAffectedAppDeployment: SchemaChangeAffectedAppDeploymentResolvers = {
  lastUsed: async (deployment, _, { injector }) => {
    return injector
      .get(AppDeploymentsManager)
      .getLastUsedForAppDeployment({ id: deployment.id } as any);
  },
  affectedOperations: (deployment, args) => {
    const allOperations = (deployment.operations ?? []).map(op => ({
      hash: op.hash,
      name: op.name,
    }));

    const limit = args.first;
    const afterCursor = args.after;

    // Find start index based on cursor
    let startIndex = 0;
    if (afterCursor) {
      const cursorIndex = allOperations.findIndex(op => op.hash === afterCursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    // Get page of operations
    const pageOperations =
      limit != null
        ? allOperations.slice(startIndex, startIndex + limit)
        : allOperations.slice(startIndex);
    const hasNextPage = limit != null ? startIndex + limit < allOperations.length : false;
    const hasPreviousPage = startIndex > 0;

    const edges = pageOperations.map(op => ({
      cursor: op.hash,
      node: op,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor: edges[0]?.cursor ?? '',
        endCursor: edges[edges.length - 1]?.cursor ?? '',
      },
    };
  },
  totalAffectedOperations: deployment => deployment.totalOperations,
};
