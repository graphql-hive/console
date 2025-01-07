/* eslint-disable no-process-env */
import { tmpFile } from '../../testkit/fs';
import { test } from '../../testkit/test';

describe('dev', () => {
  test('composes only the locally provided service', async ({ cliForProjectFederation: cli }) => {
    await cli.publish({
      sdl: 'type Query { foo: String }',
      serviceName: 'foo',
      serviceUrl: 'http://localhost/foo',
      expect: 'latest-composable',
    });

    const supergraph = tmpFile('graphql');
    const cmd = cli.dev({
      remote: false,
      services: [
        {
          name: 'bar',
          url: 'http://localhost/bar',
          sdl: 'type Query { bar: String }',
        },
      ],
      write: supergraph.filepath,
    });

    await expect(cmd).resolves.toMatch(supergraph.filepath);
    await expect(supergraph.read()).resolves.toMatch('http://localhost/bar');
    await expect(supergraph.read()).resolves.not.toMatch('http://localhost/foo');
  });
});

describe('dev --remote', () => {
  test('not available for SINGLE project', async ({ cliForProjectSingle: cli }) => {
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

  test('not available for STITCHING project', async ({ cliStitching: cli }) => {
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

  test('adds a service', async ({ cliForProjectFederation: cli }) => {
    await cli.publish({
      sdl: 'type Query { foo: String }',
      serviceName: 'foo',
      serviceUrl: 'http://localhost/foo',
      expect: 'latest-composable',
    });

    const supergraph = tmpFile('graphql');
    const cmd = cli.dev({
      remote: true,
      services: [
        {
          name: 'bar',
          url: 'http://localhost/bar',
          sdl: 'type Query { bar: String }',
        },
      ],
      write: supergraph.filepath,
    });

    await expect(cmd).resolves.toMatch(supergraph.filepath);
    await expect(supergraph.read()).resolves.toMatch('http://localhost/bar');
  });

  test('replaces a service', async ({ cliForProjectFederation: cli }) => {
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

    const supergraph = tmpFile('graphql');
    const cmd = cli.dev({
      remote: true,
      services: [
        {
          name: 'bar',
          url: 'http://localhost/bar',
          sdl: 'type Query { bar: String }',
        },
      ],
      write: supergraph.filepath,
    });

    await expect(cmd).resolves.toMatch(supergraph.filepath);
    await expect(supergraph.read()).resolves.toMatch('http://localhost/bar');
  });

  test('uses latest composable version by default', async ({
    org,
    projectFederation: project,
    cliForProjectFederation: cli,
  }) => {
    // Once we ship native federation v2 composition by default, we can remove these two lines
    await org.setFeatureFlag('compareToPreviousComposableVersion', true);
    await project.setNativeFederation(true);

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

    const supergraph = tmpFile('graphql');
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
      write: supergraph.filepath,
    });

    await expect(cmd).resolves.toMatch(supergraph.filepath);
    const content = await supergraph.read();
    expect(content).not.toMatch('http://localhost/bar');
    expect(content).toMatch('http://localhost/baz');
  });

  test('uses latest version when requested', async ({
    org,
    projectFederation: project,
    cliForProjectFederation: cli,
  }) => {
    // Once we ship native federation v2 composition by default, we can remove these two lines
    await org.setFeatureFlag('compareToPreviousComposableVersion', true);
    await project.setNativeFederation(true);

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

    const supergraph = tmpFile('graphql');
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
      write: supergraph.filepath,
    });

    // The command should fail because the latest version contains a non-shareable field and we don't override the corrupted subgraph
    await expect(cmd).rejects.toThrowError('Non-shareable field');
  });
});
