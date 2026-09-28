const TARGET_ID = 'target-1';

type Variables = { after?: string | null; filters?: { changed?: boolean; failed?: boolean } };

function check(id: string, commit: string, failed = false) {
  return {
    __typename: failed ? ('FailedSchemaCheck' as const) : ('SuccessfulSchemaCheck' as const),
    id,
    createdAt: '2026-09-27T10:00:00.000Z',
    serviceName: null,
    meta: { __typename: 'SchemaCheckMeta' as const, commit, author: 'User' },
    githubRepository: null,
  };
}

function page(nodes: ReturnType<typeof check>[], endCursor: string | null) {
  return {
    __typename: 'SchemaCheckConnection' as const,
    edges: nodes.map(node => ({ __typename: 'SchemaCheckEdge' as const, node })),
    pageInfo: {
      __typename: 'PageInfo' as const,
      hasNextPage: endCursor !== null,
      hasPreviousPage: false,
      endCursor,
    },
  };
}

/** Three checks over two pages; the failed filter leaves one, on a single page. */
export const CHECKS = {
  first: ['a1b2c3d', 'b2c3d4e'],
  second: ['c3d4e5f'],
  failed: ['b2c3d4e'],
  nextCursor: 'cursor-2',
} as const;

/** `SchemaChecks_NavigationQuery`, answered per page and filter. */
export function schemaChecksNavigation(variables: Variables) {
  const schemaChecks = variables.filters?.failed
    ? page([check('check-2', CHECKS.failed[0], true)], null)
    : variables.after
      ? page([check('check-3', CHECKS.second[0])], null)
      : page(
          [check('check-1', CHECKS.first[0]), check('check-2', CHECKS.first[1], true)],
          CHECKS.nextCursor,
        );
  return {
    __typename: 'Query' as const,
    target: { __typename: 'Target' as const, id: TARGET_ID, schemaChecks },
  };
}

/** `ChecksPageQuery` for a federation target that has checks. */
export function checksPage() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      project: { __typename: 'Project' as const, id: 'project-1', type: 'FEDERATION' },
      schemaChecks: {
        __typename: 'SchemaCheckConnection' as const,
        edges: [
          {
            __typename: 'SchemaCheckEdge' as const,
            node: { __typename: 'SuccessfulSchemaCheck' as const, id: 'check-1' },
          },
        ],
      },
    },
  };
}

export function checksFixtures() {
  return new Map<string, unknown>([
    ['ChecksPageQuery', checksPage()],
    ['SchemaChecks_NavigationQuery', schemaChecksNavigation],
  ]);
}
