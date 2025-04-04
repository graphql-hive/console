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
};
