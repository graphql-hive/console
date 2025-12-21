import type { SchemaChangeAffectedAppDeploymentResolvers } from './../../../__generated__/types';

export const SchemaChangeAffectedAppDeployment: SchemaChangeAffectedAppDeploymentResolvers = {
  affectedOperations: deployment =>
    deployment.operations.map(op => ({
      hash: op.hash,
      name: op.name,
    })),
};
