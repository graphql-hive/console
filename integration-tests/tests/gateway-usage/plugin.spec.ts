import { AddressInfo } from 'node:net';
import { parse } from 'graphql';
import { createLogger, createYoga } from 'graphql-yoga';
import { readOperationsStats } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import { describe, expect, test } from 'vitest';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import { useHive } from '@graphql-hive/gateway-usage';
import { createServer } from '@hive/service-common';

async function createSubgraphService() {
  const server = await createServer({
    sentryErrorHandler: false,
    log: {
      requests: false,
      level: 'silent',
    },
    name: 'products',
  });

  const yoga = createYoga({
    logging: false,
    schema: buildSubgraphSchema({
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
    }),
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

describe('GraphQL Hive Plugin', () => {
  test('usage data includes subgraph request data', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, waitForRequestsCollected, target } = await createProject(
      ProjectType.Single,
    );
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
    const subgraph = await createSubgraphService();
    const gateway = createGatewayRuntime({
      supergraph: `
        schema
          @link(url: "https://specs.apollo.dev/link/v1.0")
          @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        {
          query: Query
        }
        directive @join__graph(name: String!, url: String!) on ENUM_VALUE
        directive @join__type(graph: join__Graph!, key: String) repeatable on OBJECT
        directive @link(url: String, as: String, for: String) repeatable on SCHEMA
        enum join__Graph { PRODUCTS @join__graph(name: "products", url: "${subgraph.url}") }

        type Query @join__type(graph: PRODUCTS) {
          product: Product
        }
        type Product @join__type(graph: PRODUCTS, key: "id") {
          id: ID!
          price: Int
        }
      `,
      plugins: () => [plugin],
    });

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
    const operationsStatsResult = await readOperationsStats(
      { byId: target.id },
      {
        from: yesterday.toISOString(),
        to: new Date().toISOString(),
      },
      {},
      token.secret,
    ).then(r => r.expectNoGraphQLErrors());
    // @TODO after modifying the API, check the additional data (error metrics etc)
    expect(operationsStatsResult.target?.operationsStats.operations.edges[0].node.count).toBe(1);
  });
});
