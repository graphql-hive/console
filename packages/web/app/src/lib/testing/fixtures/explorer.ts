import { SLUGS } from './layouts';

const organization = {
  __typename: 'Organization' as const,
  id: 'organization-1',
  slug: SLUGS.organizationSlug,
  usageRetentionInDays: 30,
};

/** `TargetExplorerDeprecatedSchemaPageQuery` / `TargetExplorerUnusedSchemaPageQuery`: the gate for a target with usage. */
export function explorerGate(usageRetentionInDays = 30) {
  return {
    __typename: 'Query' as const,
    organization: { ...organization, usageRetentionInDays },
    hasCollectedOperations: true,
  };
}

// The retention must agree with the layout fixture's: both describe the same organization.
export function explorerFixtures(usageRetentionInDays = 30) {
  return new Map<string, unknown>([
    ['TargetExplorerDeprecatedSchemaPageQuery', explorerGate(usageRetentionInDays)],
    ['TargetExplorerUnusedSchemaPageQuery', explorerGate(usageRetentionInDays)],
  ]);
}
