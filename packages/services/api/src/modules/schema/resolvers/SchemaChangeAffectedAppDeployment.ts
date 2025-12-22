import type { SchemaChangeAffectedAppDeploymentResolvers } from './../../../__generated__/types';

export const SchemaChangeAffectedAppDeployment: SchemaChangeAffectedAppDeploymentResolvers = {
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
    const pageOperations = limit
      ? allOperations.slice(startIndex, startIndex + limit)
      : allOperations.slice(startIndex);
    const hasNextPage = limit ? startIndex + limit < allOperations.length : false;
    const hasPreviousPage = startIndex > 0;

    return {
      nodes: pageOperations,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor: pageOperations[0]?.hash ?? '',
        endCursor: pageOperations[pageOperations.length - 1]?.hash ?? '',
      },
    };
  },
  totalAffectedOperations: deployment => deployment.totalOperations,
};
