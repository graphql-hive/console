const TARGET_ID = 'target-1';

const pageInfo = { __typename: 'PageInfo' as const, hasNextPage: false, endCursor: null };

export const APP = { name: 'web-app', version: '1.0.0', label: 'web-app@1.0.0' } as const;
export const DOCUMENT = { hash: 'doc-1', operationName: 'GetUser' } as const;

type DocumentsVariables = { documentsFilter?: { operationName?: string | null } };

/** `TargetAppsViewQuery`: a target with a schema and one active deployment. */
export function appsPage() {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      latestSchemaVersion: { __typename: 'SchemaVersion' as const, id: 'version-42' },
      project: { __typename: 'Project' as const, id: 'project-1', type: 'FEDERATION' },
      appDeployments: {
        __typename: 'AppDeploymentConnection' as const,
        total: 1,
        pageInfo,
        edges: [
          {
            __typename: 'AppDeploymentEdge' as const,
            node: {
              __typename: 'AppDeployment' as const,
              id: 'deployment-1',
              name: APP.name,
              version: APP.version,
              status: 'active',
              totalDocumentCount: 1,
              createdAt: '2026-09-27T10:00:00.000Z',
              activatedAt: '2026-09-27T10:00:00.000Z',
              retiredAt: null,
              lastUsed: null,
            },
          },
        ],
      },
    },
  };
}

/** `TargetAppsVersionQuery`: one document, found by an empty search and by no other. */
export function appVersionPage(variables: DocumentsVariables = {}) {
  const edges = variables.documentsFilter?.operationName
    ? []
    : [
        {
          __typename: 'GraphQLDocumentEdge' as const,
          node: {
            __typename: 'GraphQLDocument' as const,
            hash: DOCUMENT.hash,
            body: 'query GetUser { me { id } }',
            operationName: DOCUMENT.operationName,
            insightsHash: 'insights-1',
          },
        },
      ];
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      appDeployment: {
        __typename: 'AppDeployment' as const,
        id: 'deployment-1',
        name: APP.name,
        version: APP.version,
        createdAt: '2026-09-27T10:00:00.000Z',
        activatedAt: '2026-09-27T10:00:00.000Z',
        retiredAt: null,
        lastUsed: null,
        totalDocumentCount: edges.length,
        status: 'active',
        documents: { __typename: 'GraphQLDocumentConnection' as const, pageInfo, edges },
      },
    },
  };
}

export function appsFixtures() {
  return new Map<string, unknown>([
    ['TargetAppsViewQuery', appsPage()],
    ['TargetAppsVersionQuery', appVersionPage],
  ]);
}
