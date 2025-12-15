import { createOrganizationAccessToken } from 'testkit/flow';
import { graphql } from '../../../testkit/gql';
import * as GraphQLSchema from '../../../testkit/gql/graphql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const CreatePersonalAccessTokenMutation = graphql(`
  mutation CreatePersonalAccessTokenMutation_Filter($input: CreatePersonalAccessTokenInput!) {
    createPersonalAccessToken(input: $input) {
      ok {
        privateAccessKey
        createdPersonalAccessToken {
          id
          title
        }
      }
      error {
        message
      }
    }
  }
`);

const CreateProjectAccessTokenMutation = graphql(`
  mutation CreateProjectAccessTokenMutation_Filter($input: CreateProjectAccessTokenInput!) {
    createProjectAccessToken(input: $input) {
      ok {
        privateAccessKey
        createdProjectAccessToken {
          id
          title
        }
      }
      error {
        message
      }
    }
  }
`);

const AllAccessTokensQuery = graphql(`
  query AllAccessTokensQuery(
    $organizationSlug: String!
    $first: Int
    $after: String
    $scopes: [AccessTokenScopeType!]
    $userId: ID
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      allAccessTokens(first: $first, after: $after, filter: { scopes: $scopes, userId: $userId }) {
        edges {
          cursor
          node {
            __typename
            id
            title
            ... on OrganizationAccessToken {
              createdBy {
                id
                displayName
                email
              }
            }
            ... on ProjectAccessToken {
              createdBy {
                id
                displayName
                email
              }
            }
            ... on PersonalAccessToken {
              createdBy {
                id
                displayName
                email
              }
            }
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

test.concurrent('filter: by scope ORGANIZATION only', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

  // Create an organization access token
  await createOrganizationAccessToken(
    {
      organization: { byId: org.organization.id },
      title: 'org token',
      description: 'org description',
      resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
      permissions: ['organization:describe'],
    },
    ownerToken,
  ).then(e => e.expectNoGraphQLErrors());

  // Create a project access token
  await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: { byId: project.project.id },
        title: 'project token',
        description: 'project description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Create a personal access token
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'personal token',
        description: 'personal description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query with ORGANIZATION scope filter
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      scopes: [GraphQLSchema.AccessTokenScopeType.Organization],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  expect(result.organization?.allAccessTokens.edges[0].node.__typename).toBe(
    'OrganizationAccessToken',
  );
  expect(result.organization?.allAccessTokens.edges[0].node.title).toBe('org token');
});

test.concurrent('filter: by scope PROJECT only', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

  // Create an organization access token
  await createOrganizationAccessToken(
    {
      organization: { byId: org.organization.id },
      title: 'org token',
      description: 'org description',
      resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
      permissions: ['organization:describe'],
    },
    ownerToken,
  ).then(e => e.expectNoGraphQLErrors());

  // Create a project access token
  await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: { byId: project.project.id },
        title: 'project token',
        description: 'project description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Create a personal access token
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'personal token',
        description: 'personal description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query with PROJECT scope filter
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      scopes: [GraphQLSchema.AccessTokenScopeType.Project],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  expect(result.organization?.allAccessTokens.edges[0].node.__typename).toBe('ProjectAccessToken');
  expect(result.organization?.allAccessTokens.edges[0].node.title).toBe('project token');
});

test.concurrent('filter: by scope PERSONAL only', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

  // Create an organization access token
  await createOrganizationAccessToken(
    {
      organization: { byId: org.organization.id },
      title: 'org token',
      description: 'org description',
      resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
      permissions: ['organization:describe'],
    },
    ownerToken,
  ).then(e => e.expectNoGraphQLErrors());

  // Create a project access token
  await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: { byId: project.project.id },
        title: 'project token',
        description: 'project description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Create a personal access token
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'personal token',
        description: 'personal description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query with PERSONAL scope filter
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      scopes: [GraphQLSchema.AccessTokenScopeType.Personal],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  expect(result.organization?.allAccessTokens.edges[0].node.__typename).toBe('PersonalAccessToken');
  expect(result.organization?.allAccessTokens.edges[0].node.title).toBe('personal token');
});

test.concurrent('filter: by multiple scopes', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

  // Create an organization access token
  await createOrganizationAccessToken(
    {
      organization: { byId: org.organization.id },
      title: 'org token',
      description: 'org description',
      resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
      permissions: ['organization:describe'],
    },
    ownerToken,
  ).then(e => e.expectNoGraphQLErrors());

  // Create a project access token
  await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: { byId: project.project.id },
        title: 'project token',
        description: 'project description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Create a personal access token
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'personal token',
        description: 'personal description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query with ORGANIZATION and PROJECT scope filter
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      scopes: [
        GraphQLSchema.AccessTokenScopeType.Organization,
        GraphQLSchema.AccessTokenScopeType.Project,
      ],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(2);
  const typenames = result.organization?.allAccessTokens.edges.map(e => e.node.__typename);
  expect(typenames).toContain('OrganizationAccessToken');
  expect(typenames).toContain('ProjectAccessToken');
  expect(typenames).not.toContain('PersonalAccessToken');
});

test.concurrent('filter: no filter returns all tokens', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();
  const project = await org.createProject(GraphQLSchema.ProjectType.Federation);

  // Create an organization access token
  await createOrganizationAccessToken(
    {
      organization: { byId: org.organization.id },
      title: 'org token',
      description: 'org description',
      resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
      permissions: ['organization:describe'],
    },
    ownerToken,
  ).then(e => e.expectNoGraphQLErrors());

  // Create a project access token
  await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: { byId: project.project.id },
        title: 'project token',
        description: 'project description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['project:describe'],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Create a personal access token
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'personal token',
        description: 'personal description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query without filter
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(3);
  const typenames = result.organization?.allAccessTokens.edges.map(e => e.node.__typename);
  expect(typenames).toContain('OrganizationAccessToken');
  expect(typenames).toContain('ProjectAccessToken');
  expect(typenames).toContain('PersonalAccessToken');
});

test.concurrent('filter: by userId for personal tokens', async ({ expect }) => {
  const { createOrg, ownerToken, ownerEmail } = await initSeed().createOwner();
  const org = await createOrg();

  // Invite and join a member with personalAccessToken:modify permission
  const { memberToken, member, assignMemberRole, createMemberRole } =
    await org.inviteAndJoinMember();

  // Create a role with personalAccessToken:modify permission and assign it to the member
  const memberRole = await createMemberRole(['personalAccessToken:modify']);
  await assignMemberRole({
    roleId: memberRole.id,
    userId: member.user.id,
    resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
  });

  // Create personal access token for owner
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'owner personal token',
        description: 'owner description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Create personal access token for member
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'member personal token',
        description: 'member description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: memberToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query filtered by member's userId
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      userId: member.user.id,
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  expect(result.organization?.allAccessTokens.edges[0].node.title).toBe('member personal token');
  expect(result.organization?.allAccessTokens.edges[0].node.__typename).toBe('PersonalAccessToken');
});

test.concurrent('personal access token includes createdBy information', async ({ expect }) => {
  const { createOrg, ownerToken, ownerEmail } = await initSeed().createOwner();
  const org = await createOrg();

  // Create a personal access token
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'personal token',
        description: 'personal description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query personal tokens and check createdBy field
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      scopes: [GraphQLSchema.AccessTokenScopeType.Personal],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  const personalToken = result.organization!.allAccessTokens.edges[0].node;
  expect(personalToken.__typename).toBe('PersonalAccessToken');

  if (personalToken.__typename === 'PersonalAccessToken') {
    expect(personalToken.createdBy).toBeDefined();
    expect(personalToken.createdBy?.id).toBeDefined();
    expect(personalToken.createdBy?.email).toBe(ownerEmail);
  }
});

test.concurrent('organization access token includes createdBy information', async ({ expect }) => {
  const { createOrg, ownerToken, ownerEmail } = await initSeed().createOwner();
  const org = await createOrg();

  // Create an organization access token
  await createOrganizationAccessToken(
    {
      organization: { byId: org.organization.id },
      title: 'org token',
      description: 'org description',
      resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
      permissions: [],
    },
    ownerToken,
  );

  // Query organization tokens and check createdBy field
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      scopes: [GraphQLSchema.AccessTokenScopeType.Organization],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  const orgToken = result.organization!.allAccessTokens.edges[0].node;
  expect(orgToken.__typename).toBe('OrganizationAccessToken');

  if (orgToken.__typename === 'OrganizationAccessToken') {
    expect(orgToken.createdBy).toBeDefined();
    expect(orgToken.createdBy?.id).toBeDefined();
    expect(orgToken.createdBy?.email).toBe(ownerEmail);
  }
});

test.concurrent('project access token includes createdBy information', async ({ expect }) => {
  const { createOrg, ownerToken, ownerEmail } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { project } = await createProject();

  // Create a project access token
  await execute({
    document: CreateProjectAccessTokenMutation,
    variables: {
      input: {
        project: { byId: project.id },
        title: 'project token',
        description: 'project description',
        resources: { mode: GraphQLSchema.TargetsResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query project tokens and check createdBy field
  const result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: project.organization.slug,
      scopes: [GraphQLSchema.AccessTokenScopeType.Project],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  const projectToken = result.organization!.allAccessTokens.edges[0].node;
  expect(projectToken.__typename).toBe('ProjectAccessToken');

  if (projectToken.__typename === 'ProjectAccessToken') {
    expect(projectToken.createdBy).toBeDefined();
    expect(projectToken.createdBy?.id).toBeDefined();
    expect(projectToken.createdBy?.email).toBe(ownerEmail);
  }
});

test.concurrent('filter: pagination with scope filter', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const org = await createOrg();

  // Create multiple organization access tokens
  for (let i = 1; i <= 3; i++) {
    await createOrganizationAccessToken(
      {
        organization: { byId: org.organization.id },
        title: `org token ${i}`,
        description: 'org description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: ['organization:describe'],
      },
      ownerToken,
    ).then(e => e.expectNoGraphQLErrors());
  }

  // Create a personal access token (should be filtered out)
  await execute({
    document: CreatePersonalAccessTokenMutation,
    variables: {
      input: {
        organization: { byId: org.organization.id },
        title: 'personal token',
        description: 'personal description',
        resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
        permissions: [],
      },
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  // Query first page with ORGANIZATION scope filter
  let result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      first: 2,
      scopes: [GraphQLSchema.AccessTokenScopeType.Organization],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(2);
  expect(result.organization?.allAccessTokens.pageInfo.hasNextPage).toBe(true);

  // All returned tokens should be OrganizationAccessToken
  for (const edge of result.organization?.allAccessTokens.edges ?? []) {
    expect(edge.node.__typename).toBe('OrganizationAccessToken');
  }

  // Query second page
  const endCursor = result.organization?.allAccessTokens.pageInfo.endCursor;
  result = await execute({
    document: AllAccessTokensQuery,
    variables: {
      organizationSlug: org.organization.slug,
      after: endCursor,
      scopes: [GraphQLSchema.AccessTokenScopeType.Organization],
    },
    authToken: ownerToken,
  }).then(e => e.expectNoGraphQLErrors());

  expect(result.organization?.allAccessTokens.edges).toHaveLength(1);
  expect(result.organization?.allAccessTokens.pageInfo.hasNextPage).toBe(false);
  expect(result.organization?.allAccessTokens.edges[0].node.__typename).toBe(
    'OrganizationAccessToken',
  );
});
