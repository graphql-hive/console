import { buildASTSchema, parse } from 'graphql';
import { createLogger } from 'graphql-yoga';
import { getServiceHost } from 'testkit/utils';
import { createHive } from '@graphql-hive/core';
import { appRetire } from '../../testkit/cli';
import { graphql } from '../../testkit/gql';
import { execute } from '../../testkit/graphql';
import { initSeed } from '../../testkit/seed';

const CLI_CreateAppDeployment = graphql(`
  mutation CLI_CreateAppDeployment($input: CreateAppDeploymentInput!) {
    createAppDeployment(input: $input) {
      error {
        message
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

const CLI_AddDocumentsToAppDeployment = graphql(`
  mutation CLI_AddDocumentsToAppDeployment($input: AddDocumentsToAppDeploymentInput!) {
    addDocumentsToAppDeployment(input: $input) {
      error {
        message
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

const CLI_ActivateAppDeployment = graphql(`
  mutation CLI_ActivateAppDeployment($input: ActivateAppDeploymentInput!) {
    activateAppDeployment(input: $input) {
      error {
        message
      }
      ok {
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

const CLI_UpdateTargetAppDeploymentProtectionConfiguration = graphql(`
  mutation CLI_UpdateTargetAppDeploymentProtectionConfiguration(
    $input: UpdateTargetAppDeploymentProtectionConfigurationInput!
  ) {
    updateTargetAppDeploymentProtectionConfiguration(input: $input) {
      ok {
        target {
          id
        }
      }
      error {
        message
      }
    }
  }
`);

test('app:retire --force bypasses protection', async () => {
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
    document: CLI_UpdateTargetAppDeploymentProtectionConfiguration,
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
    document: CLI_CreateAppDeployment,
    variables: {
      input: {
        appName: 'cli-force-app',
        appVersion: '1.0.0',
      },
    },
    authToken: token.secret,
  }).then(res => res.expectNoGraphQLErrors());

  await execute({
    document: CLI_AddDocumentsToAppDeployment,
    variables: {
      input: {
        appName: 'cli-force-app',
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
    document: CLI_ActivateAppDeployment,
    variables: {
      input: {
        appName: 'cli-force-app',
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
      'x-graphql-client-name': 'cli-force-app',
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
    'cli-force-app~1.0.0~hash',
  );

  await waitForOperationsCollected(1);

  const targetSlug = `${organization.slug}/${project.slug}/${target.slug}`;

  // CLI retire without --force should fail
  await expect(
    appRetire([
      '--registry.accessToken',
      token.secret,
      '--name',
      'cli-force-app',
      '--version',
      '1.0.0',
      '--target',
      targetSlug,
    ]),
  ).rejects.toThrow();

  // CLI retire with --force should succeed
  const result = await appRetire([
    '--registry.accessToken',
    token.secret,
    '--name',
    'cli-force-app',
    '--version',
    '1.0.0',
    '--target',
    targetSlug,
    '--force',
  ]);

  expect(result).toContain('retired successfully');
});
