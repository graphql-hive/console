import { graphql } from '../../../testkit/gql';
import * as GraphQLSchema from '../../../testkit/gql/graphql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';
import { deleteAccessToken, fetchPermissions } from './shared';

const CreateProjectAccessTokenMutation = graphql(`
  mutation CreateProjectAccessTokenMutation($input: CreateProjectAccessTokenInput!) {
    createProjectAccessToken(input: $input) {
      ok {
        privateAccessKey
        createdProjectAccessToken {
          id
          title
          description
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

const SimpleProjectQuery = graphql(`
  query ProjectAccessTokensProjectTestQuery($projectId: ID!) {
    project(reference: { byId: $projectId }) {
      id
      slug
    }
  }
`);

test.concurrent('create: success with admin session', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const result = await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: {
          byId: project.id,
        },
        title: 'a access token',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createProjectAccessToken.error).toEqual(null);
  expect(result.createProjectAccessToken.ok).toEqual({
    privateAccessKey: expect.any(String),
    createdProjectAccessToken: {
      id: expect.any(String),
      title: 'a access token',
      description: 'Some description',
      createdAt: expect.any(String),
    },
  });

  // no permissions :D
  expect(await fetchPermissions(result.createProjectAccessToken.ok!.privateAccessKey)).toEqual([]);
});

test.concurrent('create: failure invalid title', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const result = await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: {
          byId: project.id,
        },
        title: '   ',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createProjectAccessToken.ok).toEqual(null);
  expect(result.createProjectAccessToken.error).toMatchInlineSnapshot(`
    {
      details: {
        description: null,
        title: Can only contain letters, numbers, " ", "_", and "-".,
      },
      message: Invalid input provided.,
    }
  `);
});

test.concurrent('create: failure invalid description', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const result = await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: {
          byId: project.id,
        },
        title: 'a access token',
        description: new Array(300).fill('A').join(''),
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createProjectAccessToken.ok).toEqual(null);
  expect(result.createProjectAccessToken.error).toMatchInlineSnapshot(`
    {
      details: {
        description: Maximum length is 248 characters.,
        title: null,
      },
      message: Invalid input provided.,
    }
  `);
});

test.concurrent('create: failure because no access to project', async ({ expect }) => {
  const actor1 = await initSeed().createOwner();
  const actor2 = await initSeed().createOwner();
  const org = await actor1.createOrg();
  const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const errors = await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: {
          byId: project.id,
        },
        title: 'a access token',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
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

      message: `No access (reason: "Missing permission for performing 'projectAccessToken:modify' on resource")`,
      path: ['createProjectAccessToken'],
    },
  ]);
});

test.concurrent(
  'create: fail because of missing "projectAccessToken:modify" permission.',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const org = await createOrg();
    const { member, createMemberRole, assignMemberRole, memberToken } =
      await org.inviteAndJoinMember();
    const memberRole = await createMemberRole(['organization:describe', 'project:describe']);
    await assignMemberRole({
      roleId: memberRole.id,
      userId: member.id,
    });

    const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

    const errors = await execute({
      document: CreateProjectAccessTokenMutation,
      variables: {
        input: {
          project: {
            byId: project.id,
          },
          title: 'a access token',
          description: 'Some description',
          resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
          permissions: [],
        },
      },
      authToken: memberToken,
    }).then(e => e.expectGraphQLErrors());

    expect(errors).toMatchObject([
      {
        extensions: {
          code: 'UNAUTHORISED',
        },
        message: `No access (reason: "Missing permission for performing 'projectAccessToken:modify' on resource")`,
        path: ['createProjectAccessToken'],
      },
    ]);
  },
);

test.concurrent('query GraphQL API on resources with access', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const org = await createOrg();
  const {
    member,
    createMemberRole,
    assignMemberRole,
    memberToken: authToken,
  } = await org.inviteAndJoinMember();
  const memberRole = await createMemberRole([
    'organization:describe',
    'project:describe',
    'projectAccessToken:modify',
  ]);
  await assignMemberRole({
    roleId: memberRole.id,
    userId: member.id,
  });

  const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);
  const { project: project1 } = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const result = await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: {
          byId: project.id,
        },
        title: 'a access token',
        description: 'a description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createProjectAccessToken.error).toEqual(null);
  const organizationAccessToken = result.createProjectAccessToken.ok!.privateAccessKey;

  expect(await fetchPermissions(organizationAccessToken)).toEqual([
    {
      level: 'PROJECT',
      resolvedPermissionGroups: [
        {
          permissions: [
            {
              permission: {
                id: 'project:describe',
              },
            },
          ],
        },
      ],
      resolvedResourceIds: [`${org.organization.slug}/${project.slug}`],
    },
  ]);

  const projectQuery = await execute({
    document: SimpleProjectQuery,
    variables: {
      projectId: project.id,
    },
    authToken: organizationAccessToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(projectQuery).toEqual({
    project: {
      id: expect.any(String),
      slug: project.slug,
    },
  });

  const errors = await execute({
    document: SimpleProjectQuery,
    variables: {
      projectId: project1.id,
    },
    authToken: organizationAccessToken,
  }).then(e => e.expectGraphQLErrors());
  expect(errors).toMatchObject([
    {
      extensions: {
        code: 'UNAUTHORISED',
      },
      message: `No access (reason: "Missing permission for performing 'project:describe' on resource")`,
      path: ['project'],
    },
  ]);
});

test.concurrent('delete access token revokes access', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const org = await createOrg();
  const {
    member,
    createMemberRole,
    assignMemberRole,
    memberToken: authToken,
  } = await org.inviteAndJoinMember();
  const memberRole = await createMemberRole([
    'organization:describe',
    'project:describe',
    'projectAccessToken:modify',
  ]);
  await assignMemberRole({
    roleId: memberRole.id,
    userId: member.id,
  });

  const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const createProjectAccessTokenResult = await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: {
          byId: project.id,
        },
        title: 'a access token',
        description: 'a description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(createProjectAccessTokenResult.createProjectAccessToken.error).toEqual(null);
  const accessToken = createProjectAccessTokenResult.createProjectAccessToken.ok!;

  expect(await fetchPermissions(accessToken.privateAccessKey)).toEqual([
    {
      level: 'PROJECT',
      resolvedPermissionGroups: [
        {
          permissions: [
            {
              permission: {
                id: 'project:describe',
              },
            },
          ],
        },
      ],
      resolvedResourceIds: [`${org.organization.slug}/${project.slug}`],
    },
  ]);

  const deleteAccessTokenResult = await deleteAccessToken(
    accessToken.createdProjectAccessToken.id,
    authToken,
  ).then(res => res.expectNoGraphQLErrors());
  expect(deleteAccessTokenResult).toEqual({
    deleteAccessToken: {
      error: null,
      ok: {
        deletedAccessTokenId: accessToken.createdProjectAccessToken.id,
      },
    },
  });

  const errors = await execute({
    document: SimpleProjectQuery,
    variables: {
      projectId: project.id,
    },
    authToken: accessToken.privateAccessKey,
  }).then(e => e.expectGraphQLErrors());
  expect(errors).toMatchObject([
    {
      message: 'Invalid token provided',
    },
  ]);
});

test.concurrent('cannot delete access token without sufficient permissions', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const { member, createMemberRole, assignMemberRole, memberToken } =
    await org.inviteAndJoinMember();
  const memberRole = await createMemberRole(['organization:describe', 'project:describe']);
  await assignMemberRole({
    roleId: memberRole.id,
    userId: member.id,
  });

  const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const createProjectAccessTokenResult = await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: {
          byId: project.id,
        },
        title: 'a access token',
        description: 'a description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(createProjectAccessTokenResult.createProjectAccessToken.error).toEqual(null);
  const accessToken = createProjectAccessTokenResult.createProjectAccessToken.ok!;

  const errors = await deleteAccessToken(
    accessToken.createdProjectAccessToken.id,
    memberToken,
  ).then(res => res.expectGraphQLErrors());
  expect(errors).toMatchObject([
    {
      extensions: {
        code: 'UNAUTHORISED',
      },

      message: `No access (reason: "Missing permission for performing 'projectAccessToken:modify' on resource")`,
      path: ['deleteAccessToken'],
    },
  ]);
});

test.concurrent(
  'can delete access token without "accessToken:modify" permissions',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const org = await createOrg();
    const { member, createMemberRole, assignMemberRole, memberToken } =
      await org.inviteAndJoinMember();
    const memberRole = await createMemberRole([
      'organization:describe',
      'project:describe',
      'accessToken:modify',
    ]);
    await assignMemberRole({
      roleId: memberRole.id,
      userId: member.id,
    });

    const { project } = await org.createProject(GraphQLSchema.ProjectType.Federation);

    const createProjectAccessTokenResult = await execute({
      document: CreateProjectAccessTokenMutation,
      variables: {
        input: {
          project: {
            byId: project.id,
          },
          title: 'a access token',
          description: 'a description',
          resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
          permissions: ['project:describe'],
        },
      },
      authToken: ownerToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(createProjectAccessTokenResult.createProjectAccessToken.error).toEqual(null);
    const accessToken = createProjectAccessTokenResult.createProjectAccessToken.ok!;

    const deleteAccessTokenResult = await deleteAccessToken(
      accessToken.createdProjectAccessToken.id,
      memberToken,
    ).then(res => res.expectNoGraphQLErrors());
    expect(deleteAccessTokenResult).toEqual({
      deleteAccessToken: {
        error: null,
        ok: {
          deletedAccessTokenId: accessToken.createdProjectAccessToken.id,
        },
      },
    });
  },
);
