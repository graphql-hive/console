/* eslint-disable no-process-env */
import { ProjectType } from 'testkit/gql/graphql';
import { createCLI } from '../../testkit/cli';
import { initSeed } from '../../testkit/seed';
import { test } from '../../testkit/test';

describe('dev', () => {
  test('composes only the locally provided service', async ({ graphqlFile }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);
    const { secret } = await createTargetAccessToken({});
    const cli = createCLI({ readwrite: secret, readonly: secret });

    await cli.publish({
      sdl: 'type Query { foo: String }',
      serviceName: 'foo',
      serviceUrl: 'http://localhost/foo',
      expect: 'latest-composable',
    });

    const cmd = cli.dev({
      remote: false,
      services: [
        {
          name: 'bar',
          url: 'http://localhost/bar',
          sdl: 'type Query { bar: String }',
        },
      ],
      write: graphqlFile.path,
    });

    await expect(cmd).resolves.toMatch(graphqlFile.path);
    await expect(graphqlFile.read()).resolves.toMatch('http://localhost/bar');
    await expect(graphqlFile.read()).resolves.not.toMatch('http://localhost/foo');
  });
});

describe('dev --remote', () => {
  test('not available for SINGLE project', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Single);
    const { secret } = await createTargetAccessToken({});
    const cli = createCLI({ readwrite: secret, readonly: secret });

    const cmd = cli.dev({
      remote: true,
      services: [
        {
          name: 'foo',
          url: 'http://localhost/foo',
          sdl: 'type Query { foo: String }',
        },
      ],
    });

    await expect(cmd).rejects.toThrowError(/Only Federation projects are supported/);
  });

  test('not available for STITCHING project', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Stitching);
    const { secret } = await createTargetAccessToken({});
    const cli = createCLI({ readwrite: secret, readonly: secret });

    const cmd = cli.dev({
      remote: true,
      services: [
        {
          name: 'foo',
          url: 'http://localhost/foo',
          sdl: 'type Query { foo: String }',
        },
      ],
    });

    await expect(cmd).rejects.toThrowError(/Only Federation projects are supported/);
  });

  test('adds a service', async ({ graphqlFile }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);
    const { secret } = await createTargetAccessToken({});
    const cli = createCLI({ readwrite: secret, readonly: secret });

    await cli.publish({
      sdl: 'type Query { foo: String }',
      serviceName: 'foo',
      serviceUrl: 'http://localhost/foo',
      expect: 'latest-composable',
    });

    const cmd = cli.dev({
      remote: true,
      services: [
        {
          name: 'bar',
          url: 'http://localhost/bar',
          sdl: 'type Query { bar: String }',
        },
      ],
      write: graphqlFile.path,
    });

    await expect(cmd).resolves.toMatch(graphqlFile.path);
    await expect(graphqlFile.read()).resolves.toMatch('http://localhost/bar');
  });

  test('replaces a service', async ({ graphqlFile }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);
    const { secret } = await createTargetAccessToken({});
    const cli = createCLI({ readwrite: secret, readonly: secret });

    await cli.publish({
      sdl: 'type Query { foo: String }',
      serviceName: 'foo',
      serviceUrl: 'http://example.com/foo',
      expect: 'latest-composable',
    });

    await cli.publish({
      sdl: 'type Query { bar: String }',
      serviceName: 'bar',
      serviceUrl: 'http://example.com/bar',
      expect: 'latest-composable',
    });

    const cmd = cli.dev({
      remote: true,
      services: [
        {
          name: 'bar',
          url: 'http://localhost/bar',
          sdl: 'type Query { bar: String }',
        },
      ],
      write: graphqlFile.path,
    });

    await expect(cmd).resolves.toMatch(graphqlFile.path);
    await expect(graphqlFile.read()).resolves.toMatch('http://localhost/bar');
  });

  test('uses latest composable version by default', async ({ graphqlFile }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, setFeatureFlag } = await createOrg();
    const { createTargetAccessToken, setNativeFederation } = await createProject(
      ProjectType.Federation,
    );
    const { secret } = await createTargetAccessToken({});
    const cli = createCLI({ readwrite: secret, readonly: secret });

    // Once we ship native federation v2 composition by default, we can remove these two lines
    await setFeatureFlag('compareToPreviousComposableVersion', true);
    await setNativeFederation(true);

    await cli.publish({
      sdl: /* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

        type Query {
          foo: String
        }

        type User @key(fields: "id") {
          id: ID!
          foo: String!
        }
      `,
      serviceName: 'foo',
      serviceUrl: 'http://example.com/foo',
      expect: 'latest-composable',
    });

    // contains a non-shareable field
    await cli.publish({
      sdl: /* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

        type Query {
          bar: String
        }

        type User @key(fields: "id") {
          id: ID!
          foo: String!
        }
      `,
      serviceName: 'bar',
      serviceUrl: 'http://example.com/bar',
      expect: 'latest',
    });

    const cmd = cli.dev({
      remote: true,
      services: [
        {
          name: 'baz',
          url: 'http://localhost/baz',
          sdl: /* GraphQL */ `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

            type Query {
              baz: String
            }

            type User @key(fields: "id") {
              id: ID!
              baz: String!
            }
          `,
        },
      ],
      write: graphqlFile.path,
    });

    await expect(cmd).resolves.toMatch(graphqlFile.path);
    const content = await graphqlFile.read();
    expect(content).not.toMatch('http://localhost/bar');
    expect(content).toMatch('http://localhost/baz');
  });

  test('uses latest version when requested', async ({ graphqlFile }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, setFeatureFlag } = await createOrg();
    const { createTargetAccessToken, setNativeFederation } = await createProject(
      ProjectType.Federation,
    );
    const { secret } = await createTargetAccessToken({});
    const cli = createCLI({ readwrite: secret, readonly: secret });

    // Once we ship native federation v2 composition by default, we can remove these two lines
    await setFeatureFlag('compareToPreviousComposableVersion', true);
    await setNativeFederation(true);

    await cli.publish({
      sdl: /* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

        type Query {
          foo: String
        }

        type User @key(fields: "id") {
          id: ID!
          foo: String!
        }
      `,
      serviceName: 'foo',
      serviceUrl: 'http://example.com/foo',
      expect: 'latest-composable',
    });

    // contains a non-shareable field
    await cli.publish({
      sdl: /* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

        type Query {
          bar: String
        }

        type User @key(fields: "id") {
          id: ID!
          foo: String!
        }
      `,
      serviceName: 'bar',
      serviceUrl: 'http://example.com/bar',
      expect: 'latest',
    });

    const cmd = cli.dev({
      remote: true,
      useLatestVersion: true,
      services: [
        {
          name: 'baz',
          url: 'http://localhost/baz',
          sdl: /* GraphQL */ `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

            type Query {
              baz: String
            }

            type User @key(fields: "id") {
              id: ID!
              baz: String!
            }
          `,
        },
      ],
      write: graphqlFile.path,
    });

    // The command should fail because the latest version contains a non-shareable field and we don't override the corrupted subgraph
    await expect(cmd).rejects.toThrowError('Non-shareable field');
  });
});
