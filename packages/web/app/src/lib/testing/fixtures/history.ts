const TARGET_ID = 'target-1';

type Variables = { after?: string | null };

function version(id: string, revision: string) {
  return {
    __typename: 'SchemaVersion' as const,
    id,
    date: '2026-09-27T10:00:00.000Z',
    isValid: true,
    meta: { __typename: 'SchemaVersionMeta' as const, author: 'User', commit: 'abc1234' },
    origin: {
      __typename: 'SchemaVersionPublishOrigin' as const,
      revision,
      publishedSubgraphs: [],
    },
    githubMetadata: null,
  };
}

function page(nodes: ReturnType<typeof version>[], endCursor: string | null) {
  return {
    __typename: 'SchemaVersionConnection' as const,
    edges: nodes.map(node => ({ __typename: 'SchemaVersionEdge' as const, node })),
    pageInfo: {
      __typename: 'PageInfo' as const,
      hasNextPage: endCursor !== null,
      endCursor,
    },
  };
}

/** Three versions over two pages; each row shows its revision. */
export const VERSIONS = {
  first: ['rev-a1b2c3', 'rev-b2c3d4'],
  second: ['rev-c3d4e5'],
  nextCursor: 'cursor-2',
} as const;

/** `HistoryPage_VersionsPageQuery`, answered per page. */
export function versionsPage(variables: Variables) {
  const schemaVersions = variables.after
    ? page([version('version-40', VERSIONS.second[0])], null)
    : page(
        [version('version-42', VERSIONS.first[0]), version('version-41', VERSIONS.first[1])],
        VERSIONS.nextCursor,
      );
  return {
    __typename: 'Query' as const,
    target: { __typename: 'Target' as const, id: TARGET_ID, schemaVersions },
  };
}

/** `TargetHistoryPageQuery` for a target with versions. */
export function historyPage() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      project: { __typename: 'Project' as const, id: 'project-1', type: 'FEDERATION' },
      latestSchemaVersion: { __typename: 'SchemaVersion' as const, id: 'version-42' },
    },
  };
}

export function historyFixtures() {
  return new Map<string, unknown>([
    ['TargetHistoryPageQuery', historyPage()],
    ['HistoryPage_VersionsPageQuery', versionsPage],
  ]);
}
