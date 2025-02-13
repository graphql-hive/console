import { graphql } from '../../testkit/gql';
import * as GraphQLSchema from '../../testkit/gql/graphql';
import { execute } from '../../testkit/graphql';
import { initSeed } from '../../testkit/seed';

const CreateOrganizationAccessTokenMutation = graphql(`
  mutation CreateOrganizationAccessToken($input: CreateOrganizationAccessTokenInput!) {
    createOrganizationAccessToken(input: $input) {
      ok {
        privateAccessKey
        createdOrganizationAccessToken {
          id
          title
          description
          permissions
          createdAt
        }
      }
      error {
        message
        details {
          title
          description
        }
      }
    }
  }
`);

const OrganizationProjectTargetQuery = graphql(`
  query OrganizationProjectTargetQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        targetBySlug(targetSlug: $targetSlug) {
          id
          slug
        }
      }
    }
  }
`);

const PaginatedAccessTokensQuery = graphql(`
  query PaginatedAccessTokensQuery($organizationSlug: String!, $first: Int, $after: String) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      accessTokens(first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            title
            description
            permissions
            createdAt
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`);

test.concurrent('create: success', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  const result = await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'a access token',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentMode.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createOrganizationAccessToken.error).toEqual(null);
  expect(result.createOrganizationAccessToken.ok).toEqual({
    privateAccessKey: expect.any(String),
    createdOrganizationAccessToken: {
      id: expect.any(String),
      title: 'a access token',
      description: 'Some description',
      permissions: [],
      createdAt: expect.any(String),
    },
  });
});

test.concurrent('create: failure invalid title', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  const result = await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: '   ',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentMode.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createOrganizationAccessToken.ok).toEqual(null);
  expect(result.createOrganizationAccessToken.error).toMatchInlineSnapshot(`
    {
      details: {
        description: null,
        title: Can only contain letters, numbers, " ", '_', and '-'.,
      },
      message: Invalid input provided.,
    }
  `);
});

test.concurrent('create: failure invalid description', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  const result = await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'a access token',
        description: new Array(300).fill('A').join(''),
        resources: { mode: GraphQLSchema.ResourceAssignmentMode.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createOrganizationAccessToken.ok).toEqual(null);
  expect(result.createOrganizationAccessToken.error).toMatchInlineSnapshot(`
    {
      details: {
        description: Maximum length is 248 characters.,
        title: null,
      },
      message: Invalid input provided.,
    }
  `);
});

test.concurrent('create: failure because no access to organization', async ({ expect }) => {
  const actor1 = await initSeed().createOwner();
  const actor2 = await initSeed().createOwner();
  const org = await actor1.createOrg();

  const errors = await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'a access token',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentMode.All },
        permissions: [],
      },
    },
    authToken: actor2.ownerToken,
  }).then(e => e.expectGraphQLErrors());
  expect(errors).toMatchObject([
    {
      extensions: {
        code: 'UNAUTHORISED',
      },

      message: `No access (reason: "Missing permission for performing 'accessToken:modify' on resource")`,
      path: ['createOrganizationAccessToken'],
    },
  ]);
});

test.concurrent('query GraphQL API on resources with access', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const result = await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'a access token',
        description: 'a description',
        resources: { mode: GraphQLSchema.ResourceAssignmentMode.All },
        permissions: ['organization:describe', 'project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createOrganizationAccessToken.error).toEqual(null);
  const organizationAccessToken = result.createOrganizationAccessToken.ok!.privateAccessKey;

  const projectQuery = await execute({
    document: OrganizationProjectTargetQuery,
    variables: {
      organizationSlug: org.organization.slug,
      projectSlug: project.project.slug,
      targetSlug: project.target.slug,
    },
    authToken: organizationAccessToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(projectQuery).toEqual({
    organization: {
      id: expect.any(String),
      slug: org.organization.slug,
      project: {
        id: expect.any(String),
        slug: project.project.slug,
        targetBySlug: {
          id: expect.any(String),
          slug: project.target.slug,
        },
      },
    },
  });
});

test.concurrent('query GraphQL API on resources without access', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project1 = await org.createProject(GraphQLSchema.ProjectType.Federation);
  const project2 = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const result = await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'a access token',
        description: 'a description',
        resources: {
          mode: GraphQLSchema.ResourceAssignmentMode.Granular,
          projects: [
            {
              projectId: project1.project.id,
              targets: { mode: GraphQLSchema.ResourceAssignmentMode.All },
            },
          ],
        },
        permissions: ['organization:describe', 'project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createOrganizationAccessToken.error).toEqual(null);
  const organizationAccessToken = result.createOrganizationAccessToken.ok!.privateAccessKey;

  const projectQuery = await execute({
    document: OrganizationProjectTargetQuery,
    variables: {
      organizationSlug: org.organization.slug,
      projectSlug: project2.project.slug,
      targetSlug: project2.target.slug,
    },
    authToken: organizationAccessToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(projectQuery).toEqual({
    organization: {
      id: expect.any(String),
      project: null,
      slug: org.organization.slug,
    },
  });
});

test.concurrent('pagination', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  let paginatedResult = await execute({
    document: PaginatedAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(paginatedResult.organization?.accessTokens).toEqual({
    edges: [],
    pageInfo: {
      endCursor: '',
      hasNextPage: false,
    },
  });

  await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'first access token',
        description: 'a description',
        resources: {
          mode: GraphQLSchema.ResourceAssignmentMode.All,
        },
        permissions: ['organization:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  await execute({
    document: CreateOrganizationAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'second access token',
        description: 'a description',
        resources: {
          mode: GraphQLSchema.ResourceAssignmentMode.All,
        },
        permissions: ['organization:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  paginatedResult = await execute({
    document: PaginatedAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      first: 1,
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(paginatedResult.organization?.accessTokens).toEqual({
    edges: [
      {
        cursor: expect.any(String),
        node: {
          createdAt: expect.any(String),
          description: 'a description',
          id: expect.any(String),
          permissions: ['organization:describe'],
          title: 'second access token',
        },
      },
    ],
    pageInfo: {
      endCursor: expect.any(String),
      hasNextPage: true,
    },
  });

  const endCursor = paginatedResult.organization!.accessTokens!.pageInfo.endCursor;

  paginatedResult = await execute({
    document: PaginatedAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      after: endCursor,
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(paginatedResult.organization?.accessTokens).toEqual({
    edges: [
      {
        cursor: expect.any(String),
        node: {
          createdAt: expect.any(String),
          description: 'a description',
          id: expect.any(String),
          permissions: ['organization:describe'],
          title: 'first access token',
        },
      },
    ],
    pageInfo: {
      endCursor: expect.any(String),
      hasNextPage: false,
    },
  });
});
