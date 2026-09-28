import { SLUGS } from './layouts';

const organization = {
  __typename: 'Organization' as const,
  id: 'organization-1',
  slug: SLUGS.organizationSlug,
  usageRetentionInDays: 30,
};

/** `TargetExplorerDeprecatedSchemaPageQuery` / `TargetExplorerUnusedSchemaPageQuery`: the gate for a target with usage. */
export function explorerGate() {
  return { __typename: 'Query' as const, organization, hasCollectedOperations: true };
}

export function explorerFixtures() {
  return new Map<string, unknown>([
    ['TargetExplorerDeprecatedSchemaPageQuery', explorerGate()],
    ['TargetExplorerUnusedSchemaPageQuery', explorerGate()],
  ]);
}
