import { AddressInfo } from 'node:net';
import { DocumentNode, parse } from 'graphql';
import { createLogger, createYoga } from 'graphql-yoga';
import { pollFor, readOperationsStats } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import { describe, expect, test } from 'vitest';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { useHive } from '@graphql-hive/gateway-plugin-console-sdk';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import { createServer } from '@hive/service-common';
import { composeServices, ServiceDefinition } from '@theguild/federation-composition';

type ModulesOrSDL = Parameters<typeof buildSubgraphSchema>[0];

async function createSubgraphService(name: string, modulesOrSDL: ModulesOrSDL) {
  const server = await createServer({
    sentryErrorHandler: false,
    log: {
      requests: false,
      level: 'silent',
    },
    name,
  });

  const yoga = createYoga({
    logging: false,
    schema: buildSubgraphSchema(modulesOrSDL),
  });

  server.route({
    // Bind to the Yoga's endpoint to avoid rendering on any path
    url: yoga.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yoga.handleNodeRequestAndResponse(req, reply),
  });
  await server.listen({
    port: 0,
    host: '0.0.0.0',
  });
  return {
    url: 'http://localhost:' + (server.server.address() as AddressInfo).port + yoga.graphqlEndpoint,
    [Symbol.asyncDispose]: () => {
      server.close();
    },
  };
}

async function setup(subgraphs: {
  [key: string]: {
    typeDefs: DocumentNode;
    resolvers: any;
  };
}) {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, setFeatureFlag } = await createOrg();
  await setFeatureFlag('subgraphVisibility', true);
  const { createTargetAccessToken, waitForRequestsCollected, readSchemaCoordinateStats, target } =
    await createProject(ProjectType.Single);
  const token = await createTargetAccessToken({});
  const usageAddress = await getServiceHost('usage', 8081);
  const plugin = useHive({
    enabled: true,
    token: token.secret,
    reporting: false,
    usage: true,
    agent: {
      logger: createLogger('debug'),
      maxSize: 1,
    },
    selfHosting: {
      usageEndpoint: 'http://' + usageAddress,
      graphqlEndpoint: 'http://noop/',
      applicationUrl: 'http://noop/',
    },
    fieldLevelMetricsEnabled: true,
  });

  const services = await Promise.all(
    Object.entries(subgraphs).map(async ([name, def]): Promise<ServiceDefinition> => {
      const service = await createSubgraphService(name, def);
      return {
        name,
        typeDefs: def.typeDefs,
        url: service.url,
      };
    }),
  );
  const supergraph = composeServices(services);
  expect(supergraph.errors).toBeUndefined();
  const gateway = createGatewayRuntime({
    supergraph: supergraph.supergraphSdl!,
    plugins: () => [plugin],
  });

  return {
    target,
    gateway,
    waitForRequestsCollected,
    readSchemaCoordinateStats,
    token,
  };
}

describe('GraphQL Hive Plugin', () => {
  test('usage data includes subgraph request data', async () => {
    const subgraphs = {
      products: {
        typeDefs: parse(/* GraphQL */ `
          extend type Query {
            product: Product
          }

          type Product @key(fields: "id") {
            id: ID!
            price: Int
          }
        `),
        resolvers: {
          Query: {
            product: () => {
              return { id: 1, price: 20.2 };
            },
          },
        },
      },
    };

    const { readSchemaCoordinateStats, target, gateway, token, waitForRequestsCollected } =
      await setup(subgraphs);

    const request = new Request('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'x-graphql-client-name': 'app-name',
        'x-graphql-client-version': 'app-version',
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        query: `
          {
            product {
              id
            }
          }
        `,
      }),
    });

    const usageCollected = waitForRequestsCollected(1);
    const result = await gateway.handle(request);
    await expect(result.json()).resolves.toMatchInlineSnapshot(`
      {
        data: {
          product: {
            id: 1,
          },
        },
      }
    `);
    await usageCollected;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const period = {
      from: yesterday.toISOString(),
      to: new Date().toISOString(),
    };

    await pollFor(async () => {
      const operationsStatsResult = await readOperationsStats(
        { byId: target.id },
        period,
        {},
        token.secret,
      ).then(r => r.expectNoGraphQLErrors());
      const stats = await readSchemaCoordinateStats('Query.product', period);

      return (
        stats.target?.schemaCoordinateStats.totalResolutions === 1 &&
        stats.target?.schemaCoordinateStats.totalRequests === 1 &&
        stats.target?.schemaCoordinateStats.totalFailures === 0 &&
        operationsStatsResult.target?.operationsStats.operations.edges[0].node.count === 1
      );
    });
  });

  test('usage data includes subgraph request data, and supports multiple subgraphs', async () => {
    const subgraphs = {
      products: {
        typeDefs: parse(/* GraphQL */ `
          extend type Query {
            product: Product
          }

          type Product @key(fields: "id") {
            id: ID!
            price: Int
          }
        `),
        resolvers: {
          Query: {
            product: () => {
              return { id: 1, price: 20.2 };
            },
          },
        },
      },
      users: {
        typeDefs: parse(/* GraphQL */ `
          extend type Query {
            users: [User]
          }
          type User {
            id: ID!
            name: String
          }
        `),
        resolvers: {
          Query: {
            users: () => [{ id: 2 }],
          },
          User: {
            name: () => 'test',
          },
        },
      },
    };

    const { readSchemaCoordinateStats, target, gateway, token, waitForRequestsCollected } =
      await setup(subgraphs);

    const request = new Request('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'x-graphql-client-name': 'app-name',
        'x-graphql-client-version': 'app-version',
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        query: `
          {
            product {
              id
            }
            users {
              id
              name
            }
          }
        `,
      }),
    });

    const usageCollected = waitForRequestsCollected(1);
    const result = await gateway.handle(request);
    await expect(result.json()).resolves.toMatchInlineSnapshot(`
      {
        data: {
          product: {
            id: 1,
          },
          users: [
            {
              id: 2,
              name: test,
            },
          ],
        },
      }
    `);
    await usageCollected;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const period = {
      from: yesterday.toISOString(),
      to: new Date().toISOString(),
    };

    await pollFor(async () => {
      const operationsStatsResult = await readOperationsStats(
        { byId: target.id },
        period,
        {},
        token.secret,
      ).then(r => r.expectNoGraphQLErrors());
      const stats = await readSchemaCoordinateStats('Query.product', period);

      return (
        stats.target?.schemaCoordinateStats.totalResolutions === 1 &&
        stats.target?.schemaCoordinateStats.totalRequests === 1 &&
        stats.target?.schemaCoordinateStats.totalFailures === 0 &&
        operationsStatsResult.target?.operationsStats.operations.edges[0].node.count === 1
      );
    });
  });

  test('errors are tracked', async () => {
    const subgraphs = {
      products: {
        typeDefs: parse(/* GraphQL */ `
          extend type Query {
            product: Product
          }

          type Product @key(fields: "id") {
            id: ID!
            price: Int
          }
        `),
        resolvers: {
          Query: {
            product: () => {
              return { id: 1, price: 20.2 };
            },
          },
        },
      },
      users: {
        typeDefs: parse(/* GraphQL */ `
          extend type Query {
            users: [User]
          }
          type User {
            id: ID!
            name: String
          }
        `),
        resolvers: {
          Query: {
            users: () => [{ id: 2 }],
          },
          User: {
            name: () => {
              const err = new Error('Something went wrong');
              Object.assign(err, { code: 'OOPSIE' });
              throw err;
            },
          },
        },
      },
    };

    const { readSchemaCoordinateStats, target, gateway, token, waitForRequestsCollected } =
      await setup(subgraphs);

    const request = new Request('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'x-graphql-client-name': 'app-name',
        'x-graphql-client-version': 'app-version',
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        query: `
          {
            product {
              id
            }
            users {
              id
              name
            }
          }
        `,
      }),
    });

    const usageCollected = waitForRequestsCollected(1);
    const result = await gateway.handle(request);
    await expect(result.json()).resolves.toMatchInlineSnapshot(`
      {
        data: {
          product: {
            id: 1,
          },
          users: [
            {
              id: 2,
              name: null,
            },
          ],
        },
        errors: [
          {
            extensions: {
              code: INTERNAL_SERVER_ERROR,
            },
            message: Unexpected error.,
            path: [
              users,
              0,
              name,
            ],
          },
        ],
      }
    `);
    await usageCollected;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const period = {
      from: yesterday.toISOString(),
      to: new Date().toISOString(),
    };

    await pollFor(async () => {
      const operationsStatsResult = await readOperationsStats(
        { byId: target.id },
        period,
        {},
        token.secret,
      ).then(r => r.expectNoGraphQLErrors());
      const stats = await readSchemaCoordinateStats('Query.product', period);

      return (
        stats.target?.schemaCoordinateStats.totalResolutions === 1 &&
        stats.target?.schemaCoordinateStats.totalRequests === 1 &&
        stats.target?.schemaCoordinateStats.totalFailures === 0 &&
        operationsStatsResult.target?.operationsStats.operations.edges[0].node.count === 1
      );
    });

    await pollFor(async () => {
      const operationsStatsResult = await readOperationsStats(
        { byId: target.id },
        period,
        {},
        token.secret,
      ).then(r => r.expectNoGraphQLErrors());
      const stats = await readSchemaCoordinateStats('User.name', period);

      return (
        stats.target?.schemaCoordinateStats.totalResolutions === 1 &&
        stats.target?.schemaCoordinateStats.totalRequests === 1 &&
        stats.target?.schemaCoordinateStats.totalFailures === 1 &&
        operationsStatsResult.target?.operationsStats.operations.edges[0].node.count === 1
      );
    });
  });
});
