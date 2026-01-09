import { CriticalityLevel as CriticalityLevelEnum } from '@graphql-inspector/core';
import { BreakingSchemaChangeUsageHelper } from '../providers/breaking-schema-changes-helper';
import type {
  CriticalityLevel,
  SchemaChangeResolvers,
  SeverityLevelType,
} from './../../../__generated__/types';

const criticalityMap: Record<CriticalityLevelEnum, CriticalityLevel> = {
  [CriticalityLevelEnum.Breaking]: 'Breaking',
  [CriticalityLevelEnum.NonBreaking]: 'Safe',
  [CriticalityLevelEnum.Dangerous]: 'Dangerous',
};

const severityMap: Record<CriticalityLevelEnum, SeverityLevelType> = {
  [CriticalityLevelEnum.NonBreaking]: 'SAFE',
  [CriticalityLevelEnum.Dangerous]: 'DANGEROUS',
  [CriticalityLevelEnum.Breaking]: 'BREAKING',
};

export const SchemaChange: SchemaChangeResolvers = {
  message: (change, args) => {
    return args.withSafeBasedOnUsageNote && change.isSafeBasedOnUsage === true
      ? `${change.message} (non-breaking based on usage)`
      : change.message;
  },
  path: change => change.path?.split('.') ?? null,
  criticality: change => criticalityMap[change.criticality],
  criticalityReason: change => change.reason,
  approval: change => change.approvalMetadata,
  isSafeBasedOnUsage: change => change.isSafeBasedOnUsage,
  usageStatistics: (change, _, { injector }) =>
    injector.get(BreakingSchemaChangeUsageHelper).getUsageDataForBreakingSchemaChange(change),
  severityLevel: change => severityMap[change.criticality],
  severityReason: change => change.reason,
  affectedAppDeployments: (change, args) => {
    if (!change.affectedAppDeployments) {
      return null;
    }

    const allDeployments = change.affectedAppDeployments;
    const totalCount = allDeployments.length;

    // Apply cursor-based pagination
    let startIndex = 0;
    if (args.after) {
      const afterIndex = allDeployments.findIndex(d => d.id === args.after);
      if (afterIndex !== -1) {
        startIndex = afterIndex + 1;
      }
    }

    const limit = args.first;
    const paginatedDeployments = limit
      ? allDeployments.slice(startIndex, startIndex + limit)
      : allDeployments.slice(startIndex);

    const nodes = paginatedDeployments.map(d => ({
      id: d.id,
      name: d.name,
      version: d.version,
      operations: d.affectedOperations,
      totalOperations: d.affectedOperations.length,
    }));

    const hasNextPage = limit ? startIndex + limit < totalCount : false;

    return {
      nodes,
      totalCount,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: startIndex > 0,
        startCursor: nodes[0]?.id ?? '',
        endCursor: nodes[nodes.length - 1]?.id ?? '',
      },
    };
  },
};
