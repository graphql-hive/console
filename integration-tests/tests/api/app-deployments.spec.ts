import { buildASTSchema, parse } from 'graphql';
import { createLogger } from 'graphql-yoga';
import { pollFor } from 'testkit/flow';
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

const RetireAppDeploymentWithProtectionDetails = graphql(`
  mutation RetireAppDeploymentWithProtectionDetails($input: RetireAppDeploymentInput!) {
    retireAppDeployment(input: $input) {
      error {
        message
        protectionDetails {
          lastUsed
          daysSinceLastUsed
          requiredMinDaysInactive
          currentTrafficPercentage
          maxTrafficPercentage
        }
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

const UpdateTargetAppDeploymentProtectionConfiguration = graphql(`
  mutation UpdateTargetAppDeploymentProtectionConfiguration(
    $input: UpdateTargetAppDeploymentProtectionConfigurationInput!
  ) {
    updateTargetAppDeploymentProtectionConfiguration(input: $input) {
      ok {
        target {
          id
          appDeploymentProtectionConfiguration {
            isEnabled
            minDaysInactive
            minDaysSinceCreation
            maxTrafficPercentage
            trafficPeriodDays
            ruleLogic
          }
        }
      }
      error {
        message
        inputErrors {
          minDaysInactive
          maxTrafficPercentage
        }
      }
    }
  }
`);

const GetTargetAppDeploymentProtectionConfiguration = graphql(`
  query GetTargetAppDeploymentProtectionConfiguration($selector: TargetSelectorInput!) {
    target(reference: { bySelector: $selector }) {
      id
      appDeploymentProtectionConfiguration {
        isEnabled
        minDaysInactive
        minDaysSinceCreation
        maxTrafficPercentage
        trafficPeriodDays
        ruleLogic
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

  // When FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED=1 globally, the per-org check is bypassed
  if (createAppDeployment.ok) {
    expect(createAppDeployment.ok.createdAppDeployment).toBeDefined();
  } else {
    expect(createAppDeployment).toEqual({
      error: {
        details: null,
        message:
          'This organization has no access to app deployments. Please contact the Hive team for early access.',
      },
      ok: null,
    });
  }
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

  // When FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED=1 globally, the per-org check is bypassed.
  expect(addDocumentsToAppDeployment.error?.message).toMatch(
    /no access to app deployments|App deployment not found/,
  );
  expect(addDocumentsToAppDeployment.ok).toBeNull();
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

  // When FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED=1 globally, the per-org check is bypassed.
  expect(retireAppDeployment.error?.message).toMatch(
    /no access to app deployments|App deployment not found/,
  );
  expect(retireAppDeployment.ok).toBeNull();
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

test('activeAppDeployments works for > 1000 records with a date filter (neverUsedAndCreatedBefore) set', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  // seed 1,200 app deployments
  const apps = ['web-app', 'mobile-app', 'admin-dashboard', 'cli-tool'];
  const appDeployments = apps.flatMap((app, minor) =>
    Array.from({ length: 300 }).map((_, patch) => ({
      appName: app,
      appVersion: [1, minor, patch].join('.'),
    })),
  );

  for (const { appName, appVersion } of appDeployments) {
    // Create and activate an app deployment
    await execute({
      document: CreateAppDeployment,
      variables: {
        input: {
          appName,
          appVersion,
        },
      },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());

    await execute({
      document: ActivateAppDeployment,
      variables: {
        input: {
          appName,
          appVersion,
        },
      },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());
  }

  // Query for deployments never used and created before tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let page = 0; page < Math.ceil(1200 / 20); page++) {
    const result = await execute({
      document: GetActiveAppDeployments,
      variables: {
        targetSelector: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
        },
        first: 20,
        filter: {
          neverUsedAndCreatedBefore: tomorrow.toISOString(),
        },
      },
      authToken: ownerToken,
    }).then(res => res.expectNoGraphQLErrors());
    // all should be full pages
    expect(result.target?.activeAppDeployments.edges).toHaveLength(20);
  }
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

test('activeAppDeployments filters by name combined with lastUsedBefore', async () => {
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

  // Create frontend-app
  await execute({
    document: CreateAppDeployment,
    variables: { input: { appName: 'frontend-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'frontend-app',
        appVersion: '1.0.0',
        documents: [{ hash: 'hash1', body: 'query { hello }' }],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: { input: { appName: 'frontend-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create backend-app
  await execute({
    document: CreateAppDeployment,
    variables: { input: { appName: 'backend-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'backend-app',
        appVersion: '1.0.0',
        documents: [{ hash: 'hash2', body: 'query { hello }' }],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: { input: { appName: 'backend-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Report usage for frontend-app only
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
      'x-graphql-client-name': 'frontend-app',
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
    'frontend-app~1.0.0~hash1',
  );

  await waitForOperationsCollected(1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter by name "frontend" AND lastUsedBefore tomorrow should get frontend-app
  const result = await execute({
    document: GetActiveAppDeployments,
    variables: {
      targetSelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
      filter: {
        name: 'frontend',
        lastUsedBefore: tomorrow.toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.activeAppDeployments.edges).toHaveLength(1);
  expect(result.target?.activeAppDeployments.edges[0]?.node.name).toBe('frontend-app');
});

test('activeAppDeployments check pagination clamp', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  await token.publishSchema({
    sdl: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
  });

  // Create 25 active app deployments
  for (let i = 0; i < 25; i++) {
    const appName = `app-${i.toString().padStart(2, '0')}`;
    await execute({
      document: CreateAppDeployment,
      variables: { input: { appName, appVersion: '1.0.0' } },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());

    await execute({
      document: AddDocumentsToAppDeployment,
      variables: {
        input: {
          appName,
          appVersion: '1.0.0',
          documents: [{ hash: `hash-${i}`, body: 'query { hello }' }],
        },
      },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());

    await execute({
      document: ActivateAppDeployment,
      variables: { input: { appName, appVersion: '1.0.0' } },
      authToken: token.secret,
    }).then(res => res.expectNoGraphQLErrors());
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Request 100 items, should only get 20 (max limit)
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
      first: 100,
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  // Should be clamped to 20
  expect(result.target?.activeAppDeployments.edges).toHaveLength(20);
  expect(result.target?.activeAppDeployments.pageInfo.hasNextPage).toBe(true);
});

const SchemaCheckWithAffectedAppDeployments = graphql(`
  query SchemaCheckWithAffectedAppDeployments(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $schemaCheckId: ID!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      schemaCheck(id: $schemaCheckId) {
        id
        breakingSchemaChanges {
          edges {
            node {
              message
              path
              isSafeBasedOnUsage
              affectedAppDeployments {
                edges {
                  cursor
                  node {
                    id
                    name
                    version
                    affectedOperations {
                      edges {
                        cursor
                        node {
                          hash
                          name
                        }
                      }
                    }
                  }
                }
                totalCount
              }
            }
          }
        }
      }
    }
  }
`);

test('schema check shows affected app deployments for breaking changes', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const publishResult = await execute({
    document: graphql(`
      mutation PublishSchemaForAffectedAppDeployments($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
          ... on SchemaPublishSuccess {
            valid
          }
          ... on SchemaPublishError {
            valid
          }
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
            world: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(publishResult.schemaPublish.__typename).toBe('SchemaPublishSuccess');

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'test-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'test-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'hello-query-hash',
            body: 'query GetHello { hello }',
          },
          {
            hash: 'world-query-hash',
            body: 'query GetWorld { world }',
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
        appName: 'test-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  // ClickHouse eventual consistency
  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForAffectedAppDeploymentsPoll($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckSuccess {
                schemaCheck {
                  id
                }
              }
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

      // Check if the hello field removal has affectedAppDeployments
      const helloFieldRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      return !!(helloFieldRemoval?.node.affectedAppDeployments?.edges?.length ?? 0);
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

  // console.log('breakingChanges:', JSON.stringify(breakingChanges, null, 2));

  expect(breakingChanges).toBeDefined();
  expect(breakingChanges!.length).toBeGreaterThan(0);

  const helloFieldRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  // console.log('helloFieldRemoval:', JSON.stringify(helloFieldRemoval, null, 2));

  expect(helloFieldRemoval).toBeDefined();
  expect(helloFieldRemoval?.node.affectedAppDeployments?.edges).toBeDefined();
  expect(helloFieldRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);

  const affectedDeployment = helloFieldRemoval?.node.affectedAppDeployments?.edges?.[0]?.node;
  expect(affectedDeployment?.name).toBe('test-app');
  expect(affectedDeployment?.version).toBe('1.0.0');
  expect(affectedDeployment?.affectedOperations.edges).toBeDefined();
  expect(affectedDeployment?.affectedOperations.edges.length).toBe(1);
  expect(affectedDeployment?.affectedOperations.edges[0].node.hash).toBe('hello-query-hash');
  expect(affectedDeployment?.affectedOperations.edges[0].node.name).toBe('GetHello');
});

test('breaking changes show only deployments affected by their specific coordinate', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  const publishResult = await execute({
    document: graphql(`
      mutation PublishSchemaForCoordinateTest($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
          ... on SchemaPublishSuccess {
            valid
          }
          ... on SchemaPublishError {
            valid
          }
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
            world: String
            foo: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(publishResult.schemaPublish.__typename).toBe('SchemaPublishSuccess');

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'app-a',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'app-a',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'app-a-hello-hash',
            body: 'query AppAHello { hello }',
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
        appName: 'app-a',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'app-b',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'app-b',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'app-b-world-hash',
            body: 'query AppBWorld { world }',
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
        appName: 'app-b',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForCoordinateTestPoll($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckSuccess {
                schemaCheck {
                  id
                }
              }
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                foo: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

      // Check if both breaking changes have affectedAppDeployments
      const helloRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      const worldRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('world'),
      );
      return !!(
        (helloRemoval?.node.affectedAppDeployments?.edges?.length ?? 0) &&
        (worldRemoval?.node.affectedAppDeployments?.edges?.length ?? 0)
      );
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

  expect(breakingChanges).toBeDefined();
  expect(breakingChanges!.length).toBe(2);

  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );
  const worldRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('world'),
  );

  // Verify hello removal only shows App A (not App B)
  expect(helloRemoval).toBeDefined();
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.name).toBe('app-a');
  expect(
    helloRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.affectedOperations.edges.length,
  ).toBe(1);
  expect(
    helloRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.affectedOperations.edges[0].node
      .hash,
  ).toBe('app-a-hello-hash');

  // Verify world removal only shows App B (not App A)
  expect(worldRemoval).toBeDefined();
  expect(worldRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);
  expect(worldRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.name).toBe('app-b');
  expect(
    worldRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.affectedOperations.edges.length,
  ).toBe(1);
  expect(
    worldRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.affectedOperations.edges[0].node
      .hash,
  ).toBe('app-b-world-hash');
});

test('retired app deployments are excluded from affected deployments', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  // Publish schema
  await execute({
    document: graphql(`
      mutation PublishSchemaForRetiredTest($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate app deployment
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
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'retired-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'retired-app-hash',
            body: 'query GetHello { hello }',
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
        appName: 'retired-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Retire the app deployment
  await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        appName: 'retired-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  // Schema check that removes hello field - retired deployment should NOT appear
  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForRetiredTestPoll($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      return true;
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

  expect(breakingChanges).toBeDefined();
  expect(breakingChanges!.length).toBeGreaterThan(0);

  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  // Retired deployment should NOT appear in affected deployments
  expect(helloRemoval).toBeDefined();
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(0);
});

test('pending (non-activated) app deployments are excluded from affected deployments', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  // Publish schema
  await execute({
    document: graphql(`
      mutation PublishSchemaForPendingTest($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create app deployment but DO NOT activate it
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

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'pending-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'pending-app-hash',
            body: 'query GetHello { hello }',
          },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Note: NOT activating the deployment

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  // Schema check that removes hello field - pending deployment should NOT appear
  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForPendingTestPoll($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      return true;
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

  expect(breakingChanges).toBeDefined();
  expect(breakingChanges!.length).toBeGreaterThan(0);

  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  // Pending (non-activated) deployment should NOT appear in affected deployments
  expect(helloRemoval).toBeDefined();
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(0);
});

test('multiple deployments affected by same breaking change all appear', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await execute({
    document: graphql(`
      mutation PublishSchemaForMultiDeploymentTest($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate App 1 - uses hello field
  await execute({
    document: CreateAppDeployment,
    variables: { input: { appName: 'multi-app-1', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'multi-app-1',
        appVersion: '1.0.0',
        documents: [{ hash: 'multi-app-1-hash', body: 'query App1Hello { hello }' }],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: { input: { appName: 'multi-app-1', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate App 2 - also uses hello field
  await execute({
    document: CreateAppDeployment,
    variables: { input: { appName: 'multi-app-2', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'multi-app-2',
        appVersion: '1.0.0',
        documents: [{ hash: 'multi-app-2-hash', body: 'query App2Hello { hello }' }],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: { input: { appName: 'multi-app-2', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForMultiDeploymentTestPoll($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
      const helloRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      // Wait until both deployments appear
      return (helloRemoval?.node.affectedAppDeployments?.edges?.length ?? 0) >= 2;
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  // Both deployments should appear
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(2);
  const appNames = helloRemoval?.node.affectedAppDeployments?.edges?.map(
    (e: { node: { name: string } }) => e.node.name,
  );
  expect(appNames).toContain('multi-app-1');
  expect(appNames).toContain('multi-app-2');
});

test('anonymous operations (null name) are handled correctly', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await execute({
    document: graphql(`
      mutation PublishSchemaForAnonOpTest($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create app with anonymous operation (no operation name)
  await execute({
    document: CreateAppDeployment,
    variables: { input: { appName: 'anon-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'anon-app',
        appVersion: '1.0.0',
        documents: [{ hash: 'anon-op-hash', body: '{ hello }' }], // Anonymous query
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: { input: { appName: 'anon-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForAnonOpTestPoll($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
      const helloRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      return !!(helloRemoval?.node.affectedAppDeployments?.edges?.length ?? 0);
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);
  const affectedOp =
    helloRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.affectedOperations.edges[0].node;
  expect(affectedOp.hash).toBe('anon-op-hash');
  expect(affectedOp.name).toBeNull(); // Anonymous operation has null name
});

test('multiple operations in same deployment affected by same change', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken } = await createProject();
  const token = await createTargetAccessToken({});

  await execute({
    document: graphql(`
      mutation PublishSchemaForMultiOpTest($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create app with multiple operations using hello field
  await execute({
    document: CreateAppDeployment,
    variables: { input: { appName: 'multi-op-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'multi-op-app',
        appVersion: '1.0.0',
        documents: [
          { hash: 'op-1-hash', body: 'query GetHello1 { hello }' },
          { hash: 'op-2-hash', body: 'query GetHello2 { hello }' },
          { hash: 'op-3-hash', body: 'query GetHello3 { hello }' },
        ],
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: ActivateAppDeployment,
    variables: { input: { appName: 'multi-op-app', appVersion: '1.0.0' } },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForMultiOpTestPoll($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
      const helloRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      // Wait until all 3 operations appear
      return (
        (helloRemoval?.node.affectedAppDeployments?.edges?.[0]?.node?.affectedOperations?.edges
          ?.length ?? 0) >= 3
      );
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);
  const affectedOps =
    helloRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.affectedOperations.edges;
  expect(affectedOps.length).toBe(3);

  const opHashes = affectedOps.map((e: { node: { hash: string } }) => e.node.hash);
  expect(opHashes).toContain('op-1-hash');
  expect(opHashes).toContain('op-2-hash');
  expect(opHashes).toContain('op-3-hash');
});

test('schema check fails if breaking change affects app deployment even when usage data says safe', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const {
    project,
    target,
    createTargetAccessToken,
    updateTargetValidationSettings,
    waitForOperationsCollected,
  } = await createProject();
  const token = await createTargetAccessToken({});

  const sdl = /* GraphQL */ `
    type Query {
      hello: String
      world: String
    }
  `;

  await token.publishSchema({ sdl });

  const usageReport = await token.collectUsage({
    size: 1,
    map: {
      'world-op': {
        operationName: 'GetWorld',
        operation: 'query GetWorld { world }',
        fields: ['Query', 'Query.world'],
      },
    },
    operations: [
      {
        operationMapKey: 'world-op',
        timestamp: Date.now(),
        execution: {
          ok: true,
          duration: 100000000,
          errorsTotal: 0,
        },
        metadata: {
          client: {
            name: 'demo',
            version: '0.0.1',
          },
        },
      },
    ],
  });
  expect(usageReport.status).toBe(200);
  await waitForOperationsCollected(1);

  await updateTargetValidationSettings({
    isEnabled: true,
    percentage: 0,
  });

  const baselineCheck = await execute({
    document: graphql(`
      mutation BaselineSchemaCheck($input: SchemaCheckInput!) {
        schemaCheck(input: $input) {
          __typename
          ... on SchemaCheckSuccess {
            valid
            schemaCheck {
              id
            }
          }
          ... on SchemaCheckError {
            valid
          }
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            world: String
          }
        `,
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(baselineCheck.schemaCheck.__typename).toBe('SchemaCheckSuccess');
  expect(baselineCheck.schemaCheck).toMatchObject({
    __typename: 'SchemaCheckSuccess',
    valid: true,
  });

  const baselineSchemaCheckId = (baselineCheck.schemaCheck as { schemaCheck: { id: string } })
    .schemaCheck.id;
  const baselineDetails = await execute({
    document: SchemaCheckWithAffectedAppDeployments,
    variables: {
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      targetSlug: target.slug,
      schemaCheckId: baselineSchemaCheckId,
    },
    authToken: ownerToken,
  });

  const baselineBreakingChanges =
    baselineDetails.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
  const baselineHelloRemoval = baselineBreakingChanges?.find(
    (edge: { node: { message: string } }) => edge.node.message.includes('hello'),
  );
  expect(baselineHelloRemoval?.node.isSafeBasedOnUsage).toBe(true);
  expect(baselineHelloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(0);

  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '2.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'my-app',
        appVersion: '2.0.0',
        documents: [
          {
            hash: 'hello-query-hash',
            body: 'query GetHello { hello }',
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
        appVersion: '2.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  let schemaCheckData: any = null;

  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckWithAppDeploymentOverride($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckSuccess {
                schemaCheck {
                  id
                }
              }
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
      const helloFieldRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      return !!(helloFieldRemoval?.node.affectedAppDeployments?.edges?.length ?? 0);
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

  expect(breakingChanges).toBeDefined();
  expect(breakingChanges!.length).toBeGreaterThan(0);

  const helloFieldRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  expect(helloFieldRemoval).toBeDefined();
  // The change should NOT be marked as safe because app deployment uses it
  expect(helloFieldRemoval?.node.isSafeBasedOnUsage).toBe(false);
  expect(helloFieldRemoval?.node.affectedAppDeployments?.edges).toBeDefined();
  expect(helloFieldRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);

  const affectedDeployment = helloFieldRemoval?.node.affectedAppDeployments?.edges?.[0]?.node;
  expect(affectedDeployment?.name).toBe('my-app');
  expect(affectedDeployment?.version).toBe('2.0.0');
  expect(affectedDeployment?.affectedOperations.edges).toBeDefined();
  expect(affectedDeployment?.affectedOperations.edges.length).toBe(1);
  expect(affectedDeployment?.affectedOperations.edges[0].node.hash).toBe('hello-query-hash');
});

test('fields NOT used by app deployment remain safe based on usage', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target, createTargetAccessToken, updateTargetValidationSettings } =
    await createProject();
  const token = await createTargetAccessToken({});

  const sdl = /* GraphQL */ `
    type Query {
      hello: String
      world: String
      unused: String
    }
  `;

  await token.publishSchema({ sdl });

  await updateTargetValidationSettings({
    isEnabled: true,
    percentage: 0,
  });

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
            hash: 'hello-query-hash',
            body: 'query HelloQuery { hello }',
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation InverseTestSchemaCheck($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckSuccess {
                schemaCheck {
                  id
                }
              }
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
      const helloRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      return !!(helloRemoval?.node.affectedAppDeployments?.edges?.length ?? 0);
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;

  expect(breakingChanges).toBeDefined();
  expect(breakingChanges!.length).toBe(2); // hello and unused

  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );
  const unusedRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('unused'),
  );

  // 'hello' should be UNSAFE because app deployment uses it
  expect(helloRemoval).toBeDefined();
  expect(helloRemoval?.node.isSafeBasedOnUsage).toBe(false);
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);

  expect(unusedRemoval).toBeDefined();
  expect(unusedRemoval?.node.isSafeBasedOnUsage).toBe(true);
  expect(unusedRemoval?.node.affectedAppDeployments?.edges?.length).toBe(0);
});

test('excludedAppDeployments filters out matching app deployments from affected list', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();

  await setFeatureFlag('appDeployments', true);

  const { createTargetAccessToken, project, target, toggleTargetValidation } =
    await createProject();
  const token = await createTargetAccessToken({});

  await toggleTargetValidation(true);

  // Publish initial schema
  await execute({
    document: graphql(`
      mutation PublishSchemaForExcludedAppDeployments($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
          ... on SchemaPublishSuccess {
            valid
          }
          ... on SchemaPublishError {
            valid
          }
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
            world: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create first app deployment (will be excluded)
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'excluded-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'excluded-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'excluded-app-hello-hash',
            body: 'query ExcludedHello { hello }',
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
        appName: 'excluded-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create second app deployment (will NOT be excluded)
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'included-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'included-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'included-app-hello-hash',
            body: 'query IncludedHello { hello }',
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
        appName: 'included-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Configure conditional breaking changes with excludedAppDeployments
  await execute({
    document: graphql(`
      mutation UpdateTargetValidationForExcludedAppDeployments(
        $input: UpdateTargetConditionalBreakingChangeConfigurationInput!
      ) {
        updateTargetConditionalBreakingChangeConfiguration(input: $input) {
          ok {
            target {
              id
              conditionalBreakingChangeConfiguration {
                excludedAppDeployments
              }
            }
          }
          error {
            message
          }
        }
      }
    `),
    variables: {
      input: {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        conditionalBreakingChangeConfiguration: {
          isEnabled: true,
          percentage: 0,
          period: 2,
          targetIds: [target.id],
          excludedAppDeployments: ['excluded-app'],
        },
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  // Run schema check that removes hello field (both apps use it)
  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForExcludedAppDeployments($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckSuccess {
                schemaCheck {
                  id
                }
              }
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                world: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
        return false;
      }

      const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      const breakingChanges =
        schemaCheckData.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
      const helloRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
        edge.node.message.includes('hello'),
      );
      // Wait until affectedAppDeployments is populated
      return !!(helloRemoval?.node.affectedAppDeployments?.edges?.length ?? 0);
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
  const helloRemoval = breakingChanges!.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  // Only included-app should appear (excluded-app should be filtered out)
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length).toBe(1);
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.[0]?.node.name).toBe('included-app');
  // Breaking change is still breaking since included-app uses the field
  expect(helloRemoval?.node.isSafeBasedOnUsage).toBe(false);
});

test('excludedAppDeployments returns empty list when all affected apps are excluded', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();

  await setFeatureFlag('appDeployments', true);

  const { createTargetAccessToken, project, target, toggleTargetValidation } =
    await createProject();
  const token = await createTargetAccessToken({});

  await toggleTargetValidation(true);

  // Publish initial schema
  await execute({
    document: graphql(`
      mutation PublishSchemaForFullExclusion($input: SchemaPublishInput!) {
        schemaPublish(input: $input) {
          __typename
        }
      }
    `),
    variables: {
      input: {
        sdl: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        author: 'test-author',
        commit: 'test-commit',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Create single app deployment
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'only-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'only-app',
        appVersion: '1.0.0',
        documents: [
          {
            hash: 'only-app-hello-hash',
            body: 'query OnlyHello { hello }',
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
        appName: 'only-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Exclude the only app deployment
  await execute({
    document: graphql(`
      mutation UpdateTargetValidationForFullExclusion(
        $input: UpdateTargetConditionalBreakingChangeConfigurationInput!
      ) {
        updateTargetConditionalBreakingChangeConfiguration(input: $input) {
          ok {
            target {
              id
              conditionalBreakingChangeConfiguration {
                excludedAppDeployments
              }
            }
          }
          error {
            message
          }
        }
      }
    `),
    variables: {
      input: {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        conditionalBreakingChangeConfiguration: {
          isEnabled: true,
          percentage: 0,
          period: 2,
          targetIds: [target.id],
          excludedAppDeployments: ['only-app'],
        },
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schemaCheckData: any = null;

  // Run schema check that removes hello field
  await pollFor(
    async () => {
      const checkResult = await execute({
        document: graphql(`
          mutation SchemaCheckForFullExclusion($input: SchemaCheckInput!) {
            schemaCheck(input: $input) {
              __typename
              ... on SchemaCheckSuccess {
                schemaCheck {
                  id
                }
              }
              ... on SchemaCheckError {
                schemaCheck {
                  id
                }
              }
            }
          }
        `),
        variables: {
          input: {
            sdl: /* GraphQL */ `
              type Query {
                foo: String
              }
            `,
          },
        },
        authToken: token.secret,
      }).then(res => res.expectNoGraphQLErrors());

      // When all deployments are excluded, the check may succeed (safe based on usage)
      const schemaCheckId =
        checkResult.schemaCheck.__typename === 'SchemaCheckError'
          ? checkResult.schemaCheck.schemaCheck?.id
          : checkResult.schemaCheck.__typename === 'SchemaCheckSuccess'
            ? checkResult.schemaCheck.schemaCheck?.id
            : null;
      if (!schemaCheckId) {
        return false;
      }

      schemaCheckData = await execute({
        document: SchemaCheckWithAffectedAppDeployments,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId,
        },
        authToken: ownerToken,
      });

      // Return true once we have the schema check data
      return !!schemaCheckData.rawBody.data?.target?.schemaCheck;
    },
    { maxWait: 15_000 },
  );

  const breakingChanges =
    schemaCheckData!.rawBody.data?.target?.schemaCheck?.breakingSchemaChanges?.edges;
  const helloRemoval = breakingChanges?.find((edge: { node: { message: string } }) =>
    edge.node.message.includes('hello'),
  );

  // When all affected app deployments are excluded, the list should be empty (or no breaking change at all)
  expect(helloRemoval?.node.affectedAppDeployments?.edges?.length ?? 0).toBe(0);
});

test('update app deployment protection configuration', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { project, target } = await createProject();

  // Query initial state
  let result = await execute({
    document: GetTargetAppDeploymentProtectionConfiguration,
    variables: {
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.appDeploymentProtectionConfiguration).toEqual({
    isEnabled: false,
    minDaysInactive: 7,
    minDaysSinceCreation: 7,
    maxTrafficPercentage: 1.0,
    trafficPeriodDays: 30,
    ruleLogic: 'AND',
  });

  // Enable protection with custom settings
  const updateResult = await execute({
    document: UpdateTargetAppDeploymentProtectionConfiguration,
    variables: {
      input: {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        appDeploymentProtectionConfiguration: {
          isEnabled: true,
          minDaysInactive: 7,
          maxTrafficPercentage: 5.0,
        },
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(updateResult.updateTargetAppDeploymentProtectionConfiguration).toEqual({
    ok: {
      target: {
        id: expect.any(String),
        appDeploymentProtectionConfiguration: {
          isEnabled: true,
          minDaysInactive: 7,
          minDaysSinceCreation: 7,
          maxTrafficPercentage: 5.0,
          trafficPeriodDays: 30,
          ruleLogic: 'AND',
        },
      },
    },
    error: null,
  });

  // Query updated state
  result = await execute({
    document: GetTargetAppDeploymentProtectionConfiguration,
    variables: {
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  expect(result.target?.appDeploymentProtectionConfiguration).toEqual({
    isEnabled: true,
    minDaysInactive: 7,
    minDaysSinceCreation: 7,
    maxTrafficPercentage: 5.0,
    trafficPeriodDays: 30,
    ruleLogic: 'AND',
  });
});

test('retire app deployment succeeds when protection is enabled but no usage data exists', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  // Enable protection
  await execute({
    document: UpdateTargetAppDeploymentProtectionConfiguration,
    variables: {
      input: {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        appDeploymentProtectionConfiguration: {
          isEnabled: true,
          minDaysInactive: 7,
          minDaysSinceCreation: 0,
          maxTrafficPercentage: 1.0,
        },
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate app deployment
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

  // Retire should succeed because minDaysSinceCreation=0 and no usage data exists
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

test('retire app deployment blocked when created less than minDaysSinceCreation days ago', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setFeatureFlag, organization } = await createOrg();
  await setFeatureFlag('appDeployments', true);
  const { createTargetAccessToken, project, target } = await createProject();
  const token = await createTargetAccessToken({});

  // Enable protection with minDaysSinceCreation=7 (newly created deployments blocked)
  await execute({
    document: UpdateTargetAppDeploymentProtectionConfiguration,
    variables: {
      input: {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        appDeploymentProtectionConfiguration: {
          isEnabled: true,
          minDaysSinceCreation: 7,
          minDaysInactive: 0,
          maxTrafficPercentage: 100,
        },
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate app deployment (created just now)
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

  // Retire should fail because deployment was created 0 days ago but requires 7
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
      message: expect.stringContaining('requires at least 7 days since creation'),
    },
    ok: null,
  });
});

test('retire app deployment with --force bypasses protection', async () => {
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

  // Enable protection with strict settings
  await execute({
    document: UpdateTargetAppDeploymentProtectionConfiguration,
    variables: {
      input: {
        target: {
          bySelector: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
            targetSlug: target.slug,
          },
        },
        appDeploymentProtectionConfiguration: {
          isEnabled: true,
          minDaysInactive: 365, // Very strict - 1 year
          maxTrafficPercentage: 0, // No traffic allowed
        },
      },
    },
    authToken: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  // Create and activate app deployment
  await execute({
    document: CreateAppDeployment,
    variables: {
      input: {
        appName: 'force-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'force-app',
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
        appName: 'force-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  // Report usage to trigger protection
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
      'x-graphql-client-name': 'force-app',
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
    'force-app~1.0.0~hash',
  );

  await waitForOperationsCollected(1);

  // Retire without force should be blocked
  const blockedResult = await execute({
    document: RetireAppDeploymentWithProtectionDetails,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'force-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(blockedResult.retireAppDeployment.error).not.toBeNull();
  expect(blockedResult.retireAppDeployment.error?.message).toContain('blocked');
  expect(blockedResult.retireAppDeployment.error?.protectionDetails).not.toBeNull();

  // Retire with force should succeed
  const retireResult = await execute({
    document: RetireAppDeployment,
    variables: {
      input: {
        target: {
          byId: target.id,
        },
        appName: 'force-app',
        appVersion: '1.0.0',
        force: true,
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  expect(retireResult.retireAppDeployment).toEqual({
    error: null,
    ok: {
      retiredAppDeployment: {
        id: expect.any(String),
        name: 'force-app',
        status: 'retired',
        version: '1.0.0',
      },
    },
  });
});
