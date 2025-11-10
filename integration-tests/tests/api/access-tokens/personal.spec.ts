import { assertNonNullish } from 'testkit/utils';
import { graphql } from '../../../testkit/gql';
import * as GraphQLSchema from '../../../testkit/gql/graphql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';
import { deleteAccessToken, fetchPermissions } from './shared';

const CreatePersonalAccessTokenMutation = graphql(`
  mutation CreatePersonalAccessTokenMutation($input: CreatePersonalAccessTokenInput!) {
    createPersonalAccessToken(input: $input) {
      ok {
        privateAccessKey
        createdPersonalAccessToken {
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

const OrganizationProjectTargetQuery1 = graphql(`
  query OrganizationProjectTargetQuery1(
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

test.concurrent('create: success with admin supertokens session', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  const result = await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'an access token',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createPersonalAccessToken.error).toEqual(null);
  expect(result.createPersonalAccessToken.ok).toEqual({
    privateAccessKey: expect.any(String),
    createdPersonalAccessToken: {
      id: expect.any(String),
      title: 'an access token',
      description: 'Some description',
      createdAt: expect.any(String),
    },
  });
});

test.concurrent('create: failure invalid title', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  const result = await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: '   ',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createPersonalAccessToken.ok).toEqual(null);
  expect(result.createPersonalAccessToken.error).toMatchInlineSnapshot(`
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

  const result = await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'an access token',
        description: new Array(300).fill('A').join(''),
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createPersonalAccessToken.ok).toEqual(null);
  expect(result.createPersonalAccessToken.error).toMatchInlineSnapshot(`
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
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'an access token',
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

      message: `No access (reason: "Missing permission for performing 'personalAccessToken:modify' on resource")`,
      path: ['createPersonalAccessToken'],
    },
  ]);
});

test.concurrent('delete: successfuly delete own access token', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  const createResult = await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'an access token',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(createResult.createPersonalAccessToken.error).toEqual(null);
  assertNonNullish(createResult.createPersonalAccessToken.ok);

  const accessToken = createResult.createPersonalAccessToken.ok.createdPersonalAccessToken;

  const deleteResult = await deleteAccessToken(accessToken.id, ownerToken).then(e =>
    e.expectNoGraphQLErrors(),
  );
  expect(deleteResult.deleteAccessToken.error).toEqual(null);
  expect(deleteResult.deleteAccessToken.ok).toEqual({
    deletedAccessTokenId: accessToken.id,
  });
});

test.concurrent('delete: fail delete access token of another user', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  const user1 = await org.inviteAndJoinMember();
  const { createMemberRole, assignMemberRole } = user1;

  const memberRole = await createMemberRole([
    'organization:describe',
    'project:describe',
    'personalAccessToken:modify',
  ]);

  const user2 = await org.inviteAndJoinMember();

  await assignMemberRole({
    roleId: memberRole.id,
    userId: user1.member.id,
  });

  await assignMemberRole({
    roleId: memberRole.id,
    userId: user2.member.id,
  });

  const createResult = await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'an access token',
        description: 'Some description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: user1.memberToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(createResult.createPersonalAccessToken.error).toEqual(null);
  assertNonNullish(createResult.createPersonalAccessToken.ok);
  const accessToken = createResult.createPersonalAccessToken.ok.createdPersonalAccessToken;

  const deleteResult = await deleteAccessToken(accessToken.id, user2.memberToken).then(e =>
    e.expectGraphQLErrors(),
  );
  expect(deleteResult).toMatchObject([
    {
      extensions: {
        code: 'UNAUTHORISED',
      },
      message: `No access (reason: "Missing permission for performing 'personalAccessToken:modify' on resource")`,
      path: ['deleteAccessToken'],
    },
  ]);
});

test.concurrent('query GraphQL API on resources with access', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

  const result = await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'an access token',
        description: 'a description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['organization:describe', 'project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createPersonalAccessToken.error).toEqual(null);
  assertNonNullish(result.createPersonalAccessToken.ok);
  const personalAccessToken = result.createPersonalAccessToken.ok.privateAccessKey;

  expect(personalAccessToken).toMatch(/^hvu1\//);

  const projectQuery = await execute({
    document: OrganizationProjectTargetQuery1,
    variables: {
      organizationSlug: org.organization.slug,
      projectSlug: project.project.slug,
      targetSlug: project.target.slug,
    },
    authToken: personalAccessToken,
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
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: {
          byId: org.organization.id,
        },
        title: 'an access token',
        description: 'a description',
        resources: {
          mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
          projects: [
            {
              projectId: project1.project.id,
              targets: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
            },
          ],
        },
        permissions: ['organization:describe', 'project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(result.createPersonalAccessToken.error).toEqual(null);
  assertNonNullish(result.createPersonalAccessToken.ok);
  const personalAccessToken = result.createPersonalAccessToken.ok.privateAccessKey;

  const projectQuery = await execute({
    document: OrganizationProjectTargetQuery1,
    variables: {
      organizationSlug: org.organization.slug,
      projectSlug: project2.project.slug,
      targetSlug: project2.target.slug,
    },
    authToken: personalAccessToken,
  }).then(e => e.expectNoGraphQLErrors());
  expect(projectQuery).toEqual({
    organization: {
      id: expect.any(String),
      project: null,
      slug: org.organization.slug,
    },
  });
});

test.concurrent(
  'query GraphQL API after membership resources have been downgraded',
  async ({ expect }) => {
    const seed = await initSeed();
    const { createOrg } = await seed.createOwner();
    const org = await createOrg();
    const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

    const { member, memberToken, assignMemberRole, createMemberRole } =
      await org.inviteAndJoinMember();

    const newRole = await createMemberRole([
      'organization:describe',
      'project:describe',
      'personalAccessToken:modify',
    ]);

    // make user also an admin
    await assignMemberRole({
      userId: member.id,
      roleId: newRole.id,
    });

    const result = await execute({
      document: CreatePersonalAccessTokenMutation,
      variables: {
        input: {
          organization: {
            byId: org.organization.id,
          },
          title: 'an access token',
          description: 'a description',
          resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
          permissions: ['organization:describe', 'project:describe'],
        },
      },
      authToken: memberToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(result.createPersonalAccessToken.error).toEqual(null);
    assertNonNullish(result.createPersonalAccessToken.ok);

    const personalAccessToken = result.createPersonalAccessToken.ok.privateAccessKey;

    let projectQuery = await execute({
      document: OrganizationProjectTargetQuery1,
      variables: {
        organizationSlug: org.organization.slug,
        projectSlug: project.project.slug,
        targetSlug: project.target.slug,
      },
      authToken: personalAccessToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(projectQuery).toEqual({
      organization: {
        id: org.organization.id,
        project: {
          id: project.project.id,
          slug: project.project.slug,
          targetBySlug: {
            id: project.target.id,
            slug: project.target.slug,
          },
        },
        slug: org.organization.slug,
      },
    });

    // Update member role assignment so it looses access to describe project/target on the resources
    await assignMemberRole({
      userId: member.id,
      roleId: newRole.id,
      resources: {
        mode: GraphQLSchema.ResourceAssignmentModeType.Granular,
        projects: [],
      },
    });

    // simulate 5 minutes passing by...
    await seed.purgeOrganizationAccessTokenById(
      result.createPersonalAccessToken.ok.createdPersonalAccessToken.id,
    );

    projectQuery = await execute({
      document: OrganizationProjectTargetQuery1,
      variables: {
        organizationSlug: org.organization.slug,
        projectSlug: project.project.slug,
        targetSlug: project.target.slug,
      },
      authToken: personalAccessToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(projectQuery).toEqual({
      organization: {
        id: org.organization.id,
        project: null,
        slug: org.organization.slug,
      },
    });
  },
);

test.concurrent(
  'query GraphQL API after membership permissions have been downgraded',
  async ({ expect }) => {
    const seed = await initSeed();
    const { createOrg } = await seed.createOwner();
    const org = await createOrg();
    const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

    const { member, memberToken, assignMemberRole, createMemberRole, updateMemberRole } =
      await org.inviteAndJoinMember();

    const memberRole = await createMemberRole([
      'personalAccessToken:modify',
      'organization:describe',
      'project:describe',
    ]);

    // make user also an admin
    await assignMemberRole({
      userId: member.id,
      roleId: memberRole.id,
    });

    const result = await execute({
      document: CreatePersonalAccessTokenMutation,
      variables: {
        input: {
          organization: {
            byId: org.organization.id,
          },
          title: 'an access token',
          description: 'a description',
          resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
          permissions: ['organization:describe', 'project:describe'],
        },
      },
      authToken: memberToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(result.createPersonalAccessToken.error).toEqual(null);
    assertNonNullish(result.createPersonalAccessToken.ok);

    const personalAccessToken = result.createPersonalAccessToken.ok.privateAccessKey;

    expect(await fetchPermissions(personalAccessToken)).toEqual([
      {
        level: 'ORGANIZATION',
        resolvedPermissionGroups: [
          {
            permissions: [
              {
                permission: {
                  id: 'organization:describe',
                },
              },
            ],
          },
        ],
        resolvedResourceIds: [org.organization.slug],
      },
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
        resolvedResourceIds: [org.organization.slug + '/*'],
      },
    ]);

    let projectQuery = await execute({
      document: OrganizationProjectTargetQuery1,
      variables: {
        organizationSlug: org.organization.slug,
        projectSlug: project.project.slug,
        targetSlug: project.target.slug,
      },
      authToken: personalAccessToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(projectQuery).toEqual({
      organization: {
        id: org.organization.id,
        project: {
          id: project.project.id,
          slug: project.project.slug,
          targetBySlug: {
            id: project.target.id,
            slug: project.target.slug,
          },
        },
        slug: org.organization.slug,
      },
    });

    // Update member role to no longer allow describing projects
    await updateMemberRole(memberRole, ['personalAccessToken:modify', 'organization:describe']);

    // simulate 5 minutes passing by...
    await seed.purgeOrganizationAccessTokenById(
      result.createPersonalAccessToken.ok.createdPersonalAccessToken.id,
    );

    expect(await fetchPermissions(personalAccessToken)).toEqual([
      {
        level: 'ORGANIZATION',
        resolvedPermissionGroups: [
          {
            permissions: [
              {
                permission: {
                  id: 'organization:describe',
                },
              },
            ],
          },
        ],
        resolvedResourceIds: [org.organization.slug],
      },
    ]);

    projectQuery = await execute({
      document: OrganizationProjectTargetQuery1,
      variables: {
        organizationSlug: org.organization.slug,
        projectSlug: project.project.slug,
        targetSlug: project.target.slug,
      },
      authToken: personalAccessToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(projectQuery).toEqual({
      organization: {
        id: org.organization.id,
        project: null,
        slug: org.organization.slug,
      },
    });
  },
);

test.concurrent(
  'query GraphQL API after membership was revoked using access tokens',
  async ({ expect }) => {
    const seed = await initSeed();
    const { createOrg } = await seed.createOwner();
    const org = await createOrg();
    const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

    const { member, memberToken, assignMemberRole, createMemberRole, updateMemberRole } =
      await org.inviteAndJoinMember();

    const memberRole = await createMemberRole([
      'personalAccessToken:modify',
      'organization:describe',
      'project:describe',
    ]);

    // make user also an admin
    await assignMemberRole({
      userId: member.id,
      roleId: memberRole.id,
    });

    const result = await execute({
      document: CreatePersonalAccessTokenMutation,
      variables: {
        input: {
          organization: {
            byId: org.organization.id,
          },
          title: 'an access token',
          description: 'a description',
          resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
          permissions: ['organization:describe', 'project:describe'],
        },
      },
      authToken: memberToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(result.createPersonalAccessToken.error).toEqual(null);
    assertNonNullish(result.createPersonalAccessToken.ok);

    const personalAccessToken = result.createPersonalAccessToken.ok.privateAccessKey;

    expect(await fetchPermissions(personalAccessToken)).toEqual([
      {
        level: 'ORGANIZATION',
        resolvedPermissionGroups: [
          {
            permissions: [
              {
                permission: {
                  id: 'organization:describe',
                },
              },
            ],
          },
        ],
        resolvedResourceIds: [org.organization.slug],
      },
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
        resolvedResourceIds: [org.organization.slug + '/*'],
      },
    ]);

    let projectQuery = await execute({
      document: OrganizationProjectTargetQuery1,
      variables: {
        organizationSlug: org.organization.slug,
        projectSlug: project.project.slug,
        targetSlug: project.target.slug,
      },
      authToken: personalAccessToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(projectQuery).toEqual({
      organization: {
        id: org.organization.id,
        project: {
          id: project.project.id,
          slug: project.project.slug,
          targetBySlug: {
            id: project.target.id,
            slug: project.target.slug,
          },
        },
        slug: org.organization.slug,
      },
    });

    // Remove personalAccessToken:modify
    await updateMemberRole(memberRole, ['organization:describe', 'project:describe']);

    // simulate 5 minutes passing by...
    await seed.purgeOrganizationAccessTokenById(
      result.createPersonalAccessToken.ok.createdPersonalAccessToken.id,
    );

    expect(await fetchPermissions(personalAccessToken)).toEqual([]);

    projectQuery = await execute({
      document: OrganizationProjectTargetQuery1,
      variables: {
        organizationSlug: org.organization.slug,
        projectSlug: project.project.slug,
        targetSlug: project.target.slug,
      },
      authToken: personalAccessToken,
    }).then(e => e.expectNoGraphQLErrors());

    expect(projectQuery).toEqual({
      organization: null,
    });
  },
);
