import { assertNonNullish } from 'testkit/utils';
import { graphql } from '../../../testkit/gql';
import * as GraphQLSchema from '../../../testkit/gql/graphql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';
import { fetchPermissions } from './shared';

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

test.concurrent('create: success with admin supertokens session', async () => {
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
      permissions: [],
      createdAt: expect.any(String),
    },
  });
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
