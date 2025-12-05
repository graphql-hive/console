import { buildASTSchema, parse } from 'graphql';
import { createLogger } from 'graphql-yoga';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import { createHive } from '@graphql-hive/core';
import { graphql } from '../../testkit/gql';
import { execute } from '../../testkit/graphql';

const CreateAppDeployment = graphql(`
  mutation CreateAppDeployment($input: CreateAppDeploymentInput!) {
    createAppDeployment(input: $input) {
      error {
        message
        details {
          appName
          appVersion
        }
      }
      ok {
        createdAppDeployment {
          id
          name
          version
          status
        }
      }
    }
  }
`);

const GetAppDeployment = graphql(`
  query GetAppDeployment(
    $targetSelector: TargetSelectorInput!
    $appDeploymentName: String!
    $appDeploymentVersion: String!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      appDeployment(appName: $appDeploymentName, appVersion: $appDeploymentVersion) {
        id
        lastUsed
      }
    }
  }
`);

const GetActiveAppDeployments = graphql(`
  query GetActiveAppDeployments(
    $targetSelector: TargetSelectorInput!
    $filter: ActiveAppDeploymentsFilter!
    $first: Int
    $after: String
  ) {
    target(reference: { bySelector: $targetSelector }) {
      activeAppDeployments(filter: $filter, first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            name
            version
            status
            createdAt
            lastUsed
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
      }
    }
  }
`);

const AddDocumentsToAppDeployment = graphql(`
  mutation AddDocumentsToAppDeployment($input: AddDocumentsToAppDeploymentInput!) {
    addDocumentsToAppDeployment(input: $input) {
      error {
        message
        details {
          index
          message
        }
      }
      ok {
        appDeployment {
          id
          name
          version
          status
        }
      }
    }
  }
`);

const ActivateAppDeployment = graphql(`
  mutation ActivateAppDeployment($input: ActivateAppDeploymentInput!) {
    activateAppDeployment(input: $input) {
      error {
        message
      }
      ok {
        isSkipped
        activatedAppDeployment {
          id
          name
          version
          status
        }
      }
    }
  }
`);

const RetireAppDeployment = graphql(`
  mutation RetireAppDeployment($input: RetireAppDeploymentInput!) {
    retireAppDeployment(input: $input) {
      error {
        message
      }

      ok {
        retiredAppDeployment {
          id
          name
          version
          status
        }
      }
    }
  }
`);

const GetPaginatedPersistedDocuments = graphql(`
  query GetPaginatedPersistedDocuments(
    $targetSelector: TargetSelectorInput!
    $appDeploymentName: String!
    $appDeploymentVersion: String!
    $first: Int
    $cursor: String
  ) {
    target(reference: { bySelector: $targetSelector }) {
      appDeployment(appName: $appDeploymentName, appVersion: $appDeploymentVersion) {
        id
        documents(first: $first, after: $cursor) {
          edges {
            cursor
            node {
              hash
              body
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    }
  }
`);

test('create app deployment, add operations, publish, access via CDN (happy path)', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, createCdnAccess } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const cdnAccess = await createCdnAccess();

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: null,
    ok: {
      appDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { activateAppDeployment } = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(activateAppDeployment).toEqual({
    error: null,
    ok: {
      activatedAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'active',
      },
      isSkipped: false,
    },
  });

  const persistedOperationUrl = `${cdnAccess.cdnUrl}/apps/my-app/1.0.0/hash`;
  const response = await fetch(persistedOperationUrl, {
    method: 'GET',
    headers: {
      'X-Hive-CDN-Key': cdnAccess.secretAccessToken,
    },
  });
  const txt = await response.text();
  expect(txt).toEqual('query { hello }');
  expect(response.status).toBe(200);
});

test('create app deployment with same name and version succeed if deployment is not active', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  let createAppDeployment = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  })
    .then(res => res.expectNoGraphQLErrors())
    .then(res => res.createAppDeployment);

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  createAppDeployment = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  })
    .then(res => res.expectNoGraphQLErrors())
    .then(res => res.createAppDeployment);

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });
});

test('create app deployment with same name and version does not fail if deployment is active', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  let createAppDeployment = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  })
    .then(res => res.expectNoGraphQLErrors())
    .then(res => res.createAppDeployment);

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { activateAppDeployment } = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(activateAppDeployment).toEqual({
    error: null,
    ok: {
      activatedAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'active',
      },
      isSkipped: false,
    },
  });

  createAppDeployment = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  })
    .then(res => res.expectNoGraphQLErrors())
    .then(res => res.createAppDeployment);

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'active',
      },
    },
  });
});

test('create app deployment fails if app name is empty', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: '',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: {
      details: {
        appName: 'Must be at least 1 character long',
        appVersion: null,
      },
      message: 'Invalid input',
    },
    ok: null,
  });
});

test('create app deployment fails if app name exceeds length of 256 characters', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: new Array(257).fill('a').join(''),
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: {
      details: {
        appName: 'Must be at most 64 characters long',
        appVersion: null,
      },
      message: 'Invalid input',
    },
    ok: null,
  });
});

test('create app deployment fails if app version is empty', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'myapp',
        appVersion: '',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: {
      details: {
        appName: null,
        appVersion: 'Must be at least 1 character long',
      },
      message: 'Invalid input',
    },
    ok: null,
  });
});

test('create app deployment fails if app version exceeds length of 256 characters', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: new Array(257).fill('a').join(''),
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: {
      details: {
        appName: null,
        appVersion: 'Must be at most 64 characters long',
      },
      message: 'Invalid input',
    },
    ok: null,
  });
});

test('create app deployment fails without feature flag enabled for organization', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: {
      details: null,
      message:
        'This organization has no access to app deployments. Please contact the Hive team for early access.',
    },
    ok: null,
  });
});

test('add documents to app deployment fails if there is no initial schema published', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: null,
      message: 'No schema has been published yet',
    },
    ok: null,
  });
});

test('add documents to app deployment fails if document hash is less than 1 character', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: '',
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: {
        index: 0,
        message: 'Hash must be at least 1 characters long',
      },
      message: 'Invalid input, please check the operations.',
    },
    ok: null,
  });
});

test('add documents to app deployment fails if document hash is longer than 256 characters', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: new Array(129).fill('a').join(''),
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: {
        index: 0,
        message: 'Hash must be at most 128 characters long',
      },
      message: 'Invalid input, please check the operations.',
    },
    ok: null,
  });
});

test('add documents to app deployment fails if document is not parse-able', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'qugu',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: {
        index: 0,
        message: 'Syntax Error: Unexpected Name "qugu".',
      },
      message: 'Failed to parse a GraphQL operation.',
    },
    ok: null,
  });
});

test('add documents to app deployment fails if document does not pass validation against the target schema', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query { hi }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: {
        index: 0,
        message: 'Cannot query field "hi" on type "Query".',
      },
      message: 'The GraphQL operation is not valid against the latest schema version.',
    },
    ok: null,
  });
});

test('add documents to app deployment fails if document contains multiple executable operation definitions', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(createAppDeployment).toEqual({
    error: null,
    ok: {
      createdAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        version: '1.0.0',
        status: 'pending',
      },
    },
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query a { hello } query b { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: {
        index: 0,
        message:
          'Multiple operation definitions found. Only one executable operation definition is allowed per document.',
      },
      message: 'Only one executable operation definition is allowed per document.',
    },
    ok: null,
  });
});

test('add documents to app deployment fails if app deployment does not exist', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: null,
      message: 'App deployment not found',
    },
    ok: null,
  });
});

test('add documents to app deployment fails without feature flag enabled for organization', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(addDocumentsToAppDeployment).toEqual({
    error: {
      details: null,
      message:
        'This organization has no access to app deployments. Please contact the Hive team for early access.',
    },
    ok: null,
  });
});

test('activate app deployment fails if app deployment does not exist', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const { activateAppDeployment } = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(activateAppDeployment).toEqual({
    error: {
      message: 'App deployment not found',
    },
    ok: null,
  });
});

test('activate app deployment succeeds if app deployment is already active', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, target } = await createProject();
  const token = await createTargetAccessToken({});

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  let activateResult = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(activateResult).toEqual({
    activateAppDeployment: {
      error: null,
      ok: {
        activatedAppDeployment: {
          id: expect.any(String),
          name: 'my-app',
          status: 'active',
          version: '1.0.0',
        },
        isSkipped: false,
      },
    },
  });

  activateResult = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(activateResult).toEqual({
    activateAppDeployment: {
      error: null,
      ok: {
        activatedAppDeployment: {
          id: expect.any(String),
          name: 'my-app',
          status: 'active',
          version: '1.0.0',
        },
        isSkipped: true,
      },
    },
  });
});

test('activate app deployment fails if app deployment is retired', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, target } = await createProject();
  const token = await createTargetAccessToken({});

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  let activateResult = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(activateResult).toEqual({
    activateAppDeployment: {
      error: null,
      ok: {
        activatedAppDeployment: {
          id: expect.any(String),
          name: 'my-app',
          status: 'active',
          version: '1.0.0',
        },
        isSkipped: false,
      },
    },
  });

  const retireResult = await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(retireResult).toEqual({
    retireAppDeployment: {
      error: null,
      ok: {
        retiredAppDeployment: {
          id: expect.any(String),
          name: 'my-app',
          status: 'retired',
          version: '1.0.0',
        },
      },
    },
  });

  activateResult = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(activateResult).toEqual({
    activateAppDeployment: {
      error: {
        message: 'App deployment is retired',
      },
      ok: null,
    },
  });
});

test('retire app deployment fails if app deployment does not exist', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, target } = await createProject();
  const token = await createTargetAccessToken({});

  const { retireAppDeployment } = await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(retireAppDeployment).toEqual({
    error: {
      message: 'App deployment not found',
    },
    ok: null,
  });
});

test('retire app deployment fails if app deployment is pending (not active)', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, target } = await createProject();
  const token = await createTargetAccessToken({});

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  const { retireAppDeployment } = await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(retireAppDeployment).toEqual({
    error: {
      message: 'App deployment is not active',
    },
    ok: null,
  });
});

test('retire app deployment succeeds if app deployment is active', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, target } = await createProject();
  const token = await createTargetAccessToken({});

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  const { retireAppDeployment } = await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(retireAppDeployment).toEqual({
    error: null,
    ok: {
      retiredAppDeployment: {
        id: expect.any(String),
        name: 'my-app',
        status: 'retired',
        version: '1.0.0',
      },
    },
  });
});

test('retire app deployments makes the persisted operations unavailable via CDN', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, createCdnAccess, target } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  const cdnAccess = await createCdnAccess();

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  const persistedOperationUrl = `${cdnAccess.cdnUrl}/apps/my-app/1.0.0/hash`;
  let response = await fetch(persistedOperationUrl, {
    method: 'GET',
    headers: {
      'X-Hive-CDN-Key': cdnAccess.secretAccessToken,
    },
  });

  expect(response.status).toBe(200);

  await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  response = await fetch(persistedOperationUrl, {
    method: 'GET',
    headers: {
      'X-Hive-CDN-Key': cdnAccess.secretAccessToken,
    },
  });

  expect(response.status).toBe(404);
});

test('retire app deployments fails without feature flag enabled for organization', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, target } = await createProject();
  const token = await createTargetAccessToken({});

  const { retireAppDeployment } = await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'my-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(retireAppDeployment).toEqual({
    error: {
      message:
        'This organization has no access to app deployments. Please contact the Hive team for early access.',
    },
    ok: null,
  });
});

test('get app deployment documents via GraphQL API', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: 'app-version',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(createAppDeployment.error).toBeNull();

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        a: String
        b: String
        c: String
        d: String
      }
    `,
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: 'app-version',
        documents: [
          {
            hash: 'aaa',
            body: 'query { a }',
          },
          {
            hash: 'bbb',
            body: 'query { b }',
          },
          {
            hash: 'ccc',
            body: 'query { c }',
          },
          {
            hash: 'ddd',
            body: 'query { d }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(addDocumentsToAppDeployment.error).toBeNull();

  const result = await execute({
    document: GetPaginatedPersistedDocuments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      appDeploymentName: 'app-name',
      appDeploymentVersion: 'app-version',
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());
  expect(result.target).toMatchObject({
    appDeployment: {
      documents: {
        edges: [
          {
            cursor: 'YWFh',
            node: {
              body: 'query { a }',
              hash: 'aaa',
            },
          },
          {
            cursor: 'YmJi',
            node: {
              body: 'query { b }',
              hash: 'bbb',
            },
          },
          {
            cursor: 'Y2Nj',
            node: {
              body: 'query { c }',
              hash: 'ccc',
            },
          },
          {
            cursor: 'ZGRk',
            node: {
              body: 'query { d }',
              hash: 'ddd',
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
        },
      },
      id: expect.any(String),
    },
  });
});

test('paginate app deployment documents via GraphQL API', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: 'app-version',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(createAppDeployment.error).toBeNull();

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        a: String
        b: String
        c: String
        d: String
      }
    `,
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: 'app-version',
        documents: [
          {
            hash: 'aaa',
            body: 'query { a }',
          },
          {
            hash: 'bbb',
            body: 'query { b }',
          },
          {
            hash: 'ccc',
            body: 'query { c }',
          },
          {
            hash: 'ddd',
            body: 'query { d }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(addDocumentsToAppDeployment.error).toBeNull();

  let result = await execute({
    document: GetPaginatedPersistedDocuments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      appDeploymentName: 'app-name',
      appDeploymentVersion: 'app-version',
      first: 1,
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());
  expect(result.target).toMatchObject({
    appDeployment: {
      documents: {
        edges: [
          {
            cursor: 'YWFh',
            node: {
              body: 'query { a }',
              hash: 'aaa',
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
        },
      },
      id: expect.any(String),
    },
  });
  result = await execute({
    document: GetPaginatedPersistedDocuments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      appDeploymentName: 'app-name',
      appDeploymentVersion: 'app-version',
      first: 1,
      cursor: 'YWFh',
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());
  expect(result.target).toMatchObject({
    appDeployment: {
      documents: {
        edges: [
          {
            cursor: 'YmJi',
            node: {
              body: 'query { b }',
              hash: 'bbb',
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
        },
      },
      id: expect.any(String),
    },
  });
  result = await execute({
    document: GetPaginatedPersistedDocuments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      appDeploymentName: 'app-name',
      appDeploymentVersion: 'app-version',
      cursor: 'YmJi',
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());
  expect(result.target).toMatchObject({
    appDeployment: {
      documents: {
        edges: [
          {
            cursor: 'Y2Nj',
            node: {
              body: 'query { c }',
              hash: 'ccc',
            },
          },
          {
            cursor: 'ZGRk',
            node: {
              body: 'query { d }',
              hash: 'ddd',
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
        },
      },
      id: expect.any(String),
    },
  });
});

test('app deployment usage reporting', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target, waitForOperationsCollected } =
    await createProject();
  const token = await createTargetAccessToken({});

  const { createAppDeployment } = await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: 'app-version',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(createAppDeployment.error).toBeNull();

  const sdl = /* GraphQL */ `
    type Query {
      a: String
      b: String
      c: String
      d: String
    }
  `;

  await token.publishSchema({
    sdl,
  });

  const { addDocumentsToAppDeployment } = await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: 'app-version',
        documents: [
          {
            hash: 'aaa',
            body: 'query { a }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(addDocumentsToAppDeployment.error).toBeNull();

  const { activateAppDeployment } = await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'app-name',
        appVersion: 'app-version',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());
  expect(activateAppDeployment.error).toEqual(null);

  let data = await execute({
    document: GetAppDeployment,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      appDeploymentName: 'app-name',
      appDeploymentVersion: 'app-version',
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());
  expect(data.target?.appDeployment?.lastUsed).toEqual(null);

  const usageAddress = await getServiceHost('usage', 8081);

  const client = createHive({
    enabled: true,
    token: token.secret,
    usage: true,
    debug: false,
    agent: {
      logger: createLogger('debug'),
      maxSize: 1,
    },
    selfHosting: {
      usageEndpoint: 'http://' + usageAddress,
      graphqlEndpoint: 'http://noop/',
      applicationUrl: 'http://noop/',
    },
  });

  const request = new Request('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'x-graphql-client-name': 'app-name',
      'x-graphql-client-version': 'app-version',
    },
  });

  await client.collectUsage()(
    {
      document: parse(`query { a }`),
      schema: buildASTSchema(parse(sdl)),
      contextValue: { request },
    },
    {},
    'app-name~app-version~aaa',
  );

  await waitForOperationsCollected(1);

  data = await execute({
    document: GetAppDeployment,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      appDeploymentName: 'app-name',
      appDeploymentVersion: 'app-version',
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());
  expect(data.target?.appDeployment?.lastUsed).toEqual(expect.any(String));
});

test('activeAppDeployments returns empty list when no active deployments exist', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target } = await createProject();

  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        neverUsedAndCreatedBefore: new Date().toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.activeAppDeployments).toEqual({
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor: '',
      startCursor: '',
    },
  });
});

test('activeAppDeployments filters by neverUsedAndCreatedBefore', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  // Create and activate an app deployment
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'unused-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'unused-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Query for deployments never used and created before tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        neverUsedAndCreatedBefore: tomorrow.toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.activeAppDeployments.edges).toHaveLength(1);
  expect(result.target?.activeAppDeployments.edges[0].node).toMatchObject({
    name: 'unused-app',
    version: '1.0.0',
    status: 'active',
    lastUsed: null,
  });
  expect(result.target?.activeAppDeployments.edges[0].node.createdAt).toBeTruthy();
});

test('activeAppDeployments filters by name', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  // Create and activate multiple app deployments
  for (const appName of ['frontend-app', 'backend-app', 'mobile-app']) {
    await execute({
      document: CreateAppDeployment,
      variables: {
        input: {
          appName,
          appVersion: '1.0.0',
        },
      },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());

    await execute({
      document: ActivateAppDeployment,
      variables: {
        input: {
          appName,
          appVersion: '1.0.0',
        },
      },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Query for deployments with 'front' in the name
  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        name: 'front',
        neverUsedAndCreatedBefore: tomorrow.toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.activeAppDeployments.edges).toHaveLength(1);
  expect(result.target?.activeAppDeployments.edges[0].node.name).toBe('frontend-app');
});

test('activeAppDeployments does not return pending or retired deployments', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  // Create a pending deployment (not activated)
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'pending-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate, then retire a deployment
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'retired-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'retired-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: { byId: target.id },
        appName: 'retired-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate an active deployment
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'active-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'active-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Query should only return the active deployment
  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        neverUsedAndCreatedBefore: tomorrow.toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.activeAppDeployments.edges).toHaveLength(1);
  expect(result.target?.activeAppDeployments.edges[0].node.name).toBe('active-app');
  expect(result.target?.activeAppDeployments.edges[0].node.status).toBe('active');
});

test('activeAppDeployments filters by lastUsedBefore', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target, waitForOperationsCollected } =
    await createProject();
  const token = await createTargetAccessToken({});

  const sdl = /* GraphQL */ `
    type Query {
      hello: String
    }
  `;

  await token.publishSchema({ sdl });

  // Create and activate an app deployment
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'used-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'used-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hash',
            body: 'query { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'used-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Report usage for this deployment
  const usageAddress = await getServiceHost('usage', 8081);

  const client = createHive({
    enabled: true,
    token: token.secret,
    usage: true,
    debug: false,
    agent: {
      logger: createLogger('debug'),
      maxSize: 1,
    },
    selfHosting: {
      usageEndpoint: 'http://' + usageAddress,
      graphqlEndpoint: 'http://noop/',
      applicationUrl: 'http://noop/',
    },
  });

  const request = new Request('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'x-graphql-client-name': 'used-app',
      'x-graphql-client-version': '1.0.0',
    },
  });

  await client.collectUsage()(
    {
      document: parse(`query { hello }`),
      schema: buildASTSchema(parse(sdl)),
      contextValue: { request },
    },
    {},
    'used-app~1.0.0~hash',
  );

  await waitForOperationsCollected(1);

  // Query for deployments last used before tomorrow (should include our deployment)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        lastUsedBefore: tomorrow.toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.activeAppDeployments.edges).toHaveLength(1);
  expect(result.target?.activeAppDeployments.edges[0].node).toMatchObject({
    name: 'used-app',
    version: '1.0.0',
    status: 'active',
  });
  expect(result.target?.activeAppDeployments.edges[0].node.lastUsed).toBeTruthy();

  // Query for deployments last used before yesterday (should NOT include our deployment)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const result2 = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        lastUsedBefore: yesterday.toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result2.target?.activeAppDeployments.edges).toHaveLength(0);
});

test('activeAppDeployments applies OR logic between lastUsedBefore and neverUsedAndCreatedBefore', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target, waitForOperationsCollected } =
    await createProject();
  const token = await createTargetAccessToken({});

  const sdl = /* GraphQL */ `
    type Query {
      hello: String
    }
  `;

  await token.publishSchema({ sdl });

  // Create deployment 1: will be used (matches lastUsedBefore)
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'used-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'used-app',
        appVersion: '1.0.0',
        documents: [{ hash: 'hash1', body: 'query { hello }' }],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'used-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create deployment 2: will never be used (matches neverUsedAndCreatedBefore)
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'unused-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: {
      input: {
        appName: 'unused-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Report usage for 'used-app' only
  const usageAddress = await getServiceHost('usage', 8081);

  const client = createHive({
    enabled: true,
    token: token.secret,
    usage: true,
    debug: false,
    agent: {
      logger: createLogger('debug'),
      maxSize: 1,
    },
    selfHosting: {
      usageEndpoint: 'http://' + usageAddress,
      graphqlEndpoint: 'http://noop/',
      applicationUrl: 'http://noop/',
    },
  });

  const request = new Request('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'x-graphql-client-name': 'used-app',
      'x-graphql-client-version': '1.0.0',
    },
  });

  await client.collectUsage()(
    {
      document: parse(`query { hello }`),
      schema: buildASTSchema(parse(sdl)),
      contextValue: { request },
    },
    {},
    'used-app~1.0.0~hash1',
  );

  await waitForOperationsCollected(1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        lastUsedBefore: tomorrow.toISOString(),
        neverUsedAndCreatedBefore: tomorrow.toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  // Both deployments should match via OR logic
  expect(result.target?.activeAppDeployments.edges).toHaveLength(2);
  const names = result.target?.activeAppDeployments.edges.map(e => e.node.name).sort();
  expect(names).toEqual(['unused-app', 'used-app']);

  // Verify one has lastUsed and one doesn't
  const usedApp = result.target?.activeAppDeployments.edges.find(e => e.node.name === 'used-app');
  const unusedApp = result.target?.activeAppDeployments.edges.find(
    e => e.node.name === 'unused-app',
  );
  expect(usedApp?.node.lastUsed).toBeTruthy();
  expect(unusedApp?.node.lastUsed).toBeNull();
});

test('activeAppDeployments pagination with first and after', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  // Create 5 active deployments
  for (let i = 1; i <= 5; i++) {
    await execute({
      document: CreateAppDeployment,
      variables: {
        input: {
          appName: `app-${i}`,
          appVersion: '1.0.0',
        },
      },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());

    await execute({
      document: ActivateAppDeployment,
      variables: {
        input: {
          appName: `app-${i}`,
          appVersion: '1.0.0',
        },
      },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Query with first: 2
  const result1 = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        neverUsedAndCreatedBefore: tomorrow.toISOString(),
      },
      first: 2,
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result1.target?.activeAppDeployments.edges).toHaveLength(2);
  expect(result1.target?.activeAppDeployments.pageInfo.hasNextPage).toBe(true);
  expect(result1.target?.activeAppDeployments.pageInfo.endCursor).toBeTruthy();

  // Query with after cursor to get next page
  const endCursor = result1.target?.activeAppDeployments.pageInfo.endCursor;

  const result2 = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        neverUsedAndCreatedBefore: tomorrow.toISOString(),
      },
      first: 2,
      after: endCursor,
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result2.target?.activeAppDeployments.edges).toHaveLength(2);
  expect(result2.target?.activeAppDeployments.pageInfo.hasNextPage).toBe(true);
  expect(result2.target?.activeAppDeployments.pageInfo.hasPreviousPage).toBe(true);

  // Get the last page
  const endCursor2 = result2.target?.activeAppDeployments.pageInfo.endCursor;

  const result3 = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        neverUsedAndCreatedBefore: tomorrow.toISOString(),
      },
      first: 2,
      after: endCursor2,
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result3.target?.activeAppDeployments.edges).toHaveLength(1);
  expect(result3.target?.activeAppDeployments.pageInfo.hasNextPage).toBe(false);

  // Verify we got all 5 unique apps across all pages
  const allNames = [
    ...result1.target!.activeAppDeployments.edges.map(e => e.node.name),
    ...result2.target!.activeAppDeployments.edges.map(e => e.node.name),
    ...result3.target!.activeAppDeployments.edges.map(e => e.node.name),
  ];
  expect(allNames).toHaveLength(5);
  expect(new Set(allNames).size).toBe(5);
});

test('activeAppDeployments returns error for invalid date filter', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { target, project } = await createProject();

  // DateTime scalar rejects invalid date strings at the GraphQL level
  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        lastUsedBefore: 'not-a-valid-date',
      },
    },
    authToken: ownerToken,
  });

  expect(result.rawBody.errors).toBeDefined();
  expect(result.rawBody.errors?.[0]?.message).toMatch(/DateTime|Invalid|date/i);
});
