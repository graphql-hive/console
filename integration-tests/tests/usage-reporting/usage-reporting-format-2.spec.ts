import { randomUUID } from 'node:crypto';
import { buildASTSchema, GraphQLError, parse } from 'graphql';
import { createLogger } from 'graphql-yoga';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import z from 'zod';
import { createHive } from '../../../packages/libraries/core/src';
import { clickHouseQuery } from '../../testkit/clickhouse';
import { waitForExpectations } from '../../testkit/flow';
import { getServiceHost } from '../../testkit/utils';

test('valid operation is accepted', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 3,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: 1663158676535,
          execution: {
            ok: true,
            duration: 150000000,
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
    }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 1,
      rejected: 0,
    },
  });
});

test('invalid operation is rejected', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);
  // GraphQL operation is invalid at Query.me(id:)
  const faultyOperation = 'query me { me(id: ) { id name } }';

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 3,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: faultyOperation,
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: 1663158676535,
          execution: {
            ok: true,
            duration: 150000000,
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
    }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 0,
      rejected: 1,
    },
  });
});

test('reject a report with a negative timestamp', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 1,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: -1663158676535,
          execution: {
            ok: true,
            duration: 150000000,
            errorsTotal: 0,
          },
        },
      ],
    }),
  });
  expect(response.status).toBe(400);
});

test('reject a report with an too short timestamp', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 1,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: 1234,
          execution: {
            ok: true,
            duration: 150000000,
            errorsTotal: 0,
          },
        },
      ],
    }),
  });
  expect(response.status).toBe(400);
});

test('reject a report with a negative duration', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 1,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: 1663158676535,
          execution: {
            ok: true,
            duration: -150000000,
            errorsTotal: 0,
          },
        },
      ],
    }),
  });
  expect(response.status).toBe(400);
});

test('reject a report with a too big duration', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 1,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: 1663158676535,
          execution: {
            ok: true,
            duration: Math.pow(2, 64),
            errorsTotal: 0,
          },
        },
      ],
    }),
  });
  expect(response.status).toBe(400);
});

test('reject a report with a negative errorsTotal', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 1,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: 1663158676535,
          execution: {
            ok: true,
            duration: 150000000,
            errorsTotal: -2,
          },
        },
      ],
    }),
  });
  expect(response.status).toBe(400);
});

test('reject a report with a too big errorsTotal', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject();
  const { secret: accessToken } = await createTargetAccessToken({});

  const usageAddress = await getServiceHost('usage', 8081);

  const response = await fetch(`http://${usageAddress}`, {
    method: 'POST',
    headers: {
      'X-Usage-API-Version': '2',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 1,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: 1663158676535,
          execution: {
            ok: true,
            duration: Math.pow(2, 10),
            errorsTotal: Math.pow(2, 25),
          },
        },
      ],
    }),
  });
  expect(response.status).toBe(400);
});

describe('graph', () => {
  const GraphColumnsRowsModel = z.array(
    z.object({
      client_name: z.string(),
      graph_id: z.string(),
      graph_version_id: z.string(),
    }),
  );

  const schema = buildASTSchema(
    parse(`
      type Query {
        a: String
        b: String
      }
      type Subscription {
        onA: String
      }
    `),
  );

  async function createTargetWithAccessToken() {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
    const { secret: accessToken } = await createTargetAccessToken({});
    return { target, accessToken };
  }

  async function setupSDK() {
    const { target, accessToken } = await createTargetWithAccessToken();
    const usageAddress = await getServiceHost('usage', 8081);

    const client = createHive({
      enabled: true,
      token: accessToken,
      usage: {
        // required for reporting errors with their schema coordinate (operation_errors)
        fieldLevelMetricsEnabled: true,
      },
      debug: false,
      agent: {
        logger: createLogger('debug'),
        // only flush on dispose, so every operation ends up in a single report
        maxSize: 1000,
      },
      selfHosting: {
        usageEndpoint: 'http://' + usageAddress,
        graphqlEndpoint: 'http://noop/',
        applicationUrl: 'http://noop/',
      },
    });

    return {
      target,
      client,
      graph: { graphId: randomUUID(), graphVersionId: randomUUID() },
    };
  }

  function contextForClient(name: string) {
    return {
      request: new Request('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'x-graphql-client-name': name,
          'x-graphql-client-version': '1.0.0',
        },
      }),
    };
  }

  /** The SDK never reports invalid graph ids, so rejections are tested with raw reports. */
  async function sendUsageReportV2(accessToken: string, report: unknown) {
    const usageAddress = await getServiceHost('usage', 8081);
    return fetch(`http://${usageAddress}`, {
      method: 'POST',
      headers: {
        'X-Usage-API-Version': '2',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(report),
    });
  }

  test.concurrent(
    'graph reported by the SDK is stored for operations, operation collection and operation errors',
    async ({ expect }) => {
      const { target, client, graph } = await setupSDK();
      const document = parse(`
        query a {
          a
        }
      `);

      await client.collectUsage({ graph }).finish(
        { schema, document, contextValue: contextForClient('with-graph') },
        {
          data: { a: null },
          errors: [new GraphQLError('boom', { path: ['a'], extensions: { code: 'BOOM' } })],
        },
      );
      await client
        .collectUsage()
        .finish(
          { schema, document, contextValue: contextForClient('without-graph') },
          { data: { a: 'a' } },
        );
      await client.dispose();

      await waitForExpectations(async () => {
        const result = await clickHouseQuery(`
          SELECT client_name, graph_id, graph_version_id
          FROM operations
          WHERE target = '${target.id}'
          ORDER BY client_name
        `);
        expect(GraphColumnsRowsModel.parse(result.data)).toEqual([
          {
            client_name: 'with-graph',
            graph_id: graph.graphId,
            graph_version_id: graph.graphVersionId,
          },
          {
            client_name: 'without-graph',
            graph_id: '00000000-0000-0000-0000-000000000000',
            graph_version_id: '00000000-0000-0000-0000-000000000000',
          },
        ]);
      });

      // the same operation reported with and without a graph results in one record per graph
      await waitForExpectations(async () => {
        const result = await clickHouseQuery(`
          SELECT graph_id, graph_version_id, toUInt32(sum(total)) AS total
          FROM operation_collection
          WHERE target = '${target.id}'
          GROUP BY graph_id, graph_version_id
          ORDER BY graph_id
        `);
        expect(
          z
            .array(
              z.object({ graph_id: z.string(), graph_version_id: z.string(), total: z.number() }),
            )
            .parse(result.data),
        ).toEqual([
          {
            graph_id: '00000000-0000-0000-0000-000000000000',
            graph_version_id: '00000000-0000-0000-0000-000000000000',
            total: 1,
          },
          { graph_id: graph.graphId, graph_version_id: graph.graphVersionId, total: 1 },
        ]);
      });

      await waitForExpectations(async () => {
        const result = await clickHouseQuery(`
          SELECT
            graph_id,
            graph_version_id,
            arrayStringConcat(arrayMap(e -> concat(tupleElement(e, 1), ':', tupleElement(e, 2)), errors), ',') AS errors
          FROM operation_errors
          WHERE target = '${target.id}'
        `);
        expect(
          z
            .array(
              z.object({ graph_id: z.string(), graph_version_id: z.string(), errors: z.string() }),
            )
            .parse(result.data),
        ).toEqual([
          {
            graph_id: graph.graphId,
            graph_version_id: graph.graphVersionId,
            errors: 'BOOM:Query.a',
          },
        ]);
      });
    },
  );

  test.concurrent(
    'graph reported by the SDK is stored for subscription operations',
    async ({ expect }) => {
      const { target, client, graph } = await setupSDK();
      const document = parse(`
        subscription onA {
          onA
        }
      `);

      client.collectSubscriptionUsage({
        args: { schema, document, contextValue: contextForClient('with-graph') },
        graph,
      });
      client.collectSubscriptionUsage({
        args: { schema, document, contextValue: contextForClient('without-graph') },
      });
      await client.dispose();

      await waitForExpectations(async () => {
        const result = await clickHouseQuery(`
          SELECT client_name, graph_id, graph_version_id
          FROM subscription_operations
          WHERE target = '${target.id}'
          ORDER BY client_name
        `);
        expect(GraphColumnsRowsModel.parse(result.data)).toEqual([
          {
            client_name: 'with-graph',
            graph_id: graph.graphId,
            graph_version_id: graph.graphVersionId,
          },
          {
            client_name: 'without-graph',
            graph_id: '00000000-0000-0000-0000-000000000000',
            graph_version_id: '00000000-0000-0000-0000-000000000000',
          },
        ]);
      });
    },
  );

  test.concurrent(
    'graph reported by the SDK is stored for app deployment usage of persisted documents',
    async ({ expect }) => {
      const { target, client, graph } = await setupSDK();
      const document = parse(`
        query b {
          b
        }
      `);

      await client
        .collectUsage({ graph })
        .finish(
          { schema, document, contextValue: contextForClient('my-app') },
          { data: { b: 'b' } },
          'my-app~1.0.0~withgraph',
        );
      await client
        .collectUsage()
        .finish(
          { schema, document, contextValue: contextForClient('my-app') },
          { data: { b: 'b' } },
          'my-app~1.0.0~withoutgraph',
        );
      await client.dispose();

      await waitForExpectations(async () => {
        const result = await clickHouseQuery(`
          SELECT DISTINCT app_name, app_version, graph_id, graph_version_id
          FROM app_deployment_usage
          WHERE target_id = '${target.id}'
          ORDER BY graph_id
        `);
        expect(
          z
            .array(
              z.object({
                app_name: z.string(),
                app_version: z.string(),
                graph_id: z.string(),
                graph_version_id: z.string(),
              }),
            )
            .parse(result.data),
        ).toEqual([
          {
            app_name: 'my-app',
            app_version: '1.0.0',
            graph_id: '00000000-0000-0000-0000-000000000000',
            graph_version_id: '00000000-0000-0000-0000-000000000000',
          },
          {
            app_name: 'my-app',
            app_version: '1.0.0',
            graph_id: graph.graphId,
            graph_version_id: graph.graphVersionId,
          },
        ]);
      });
    },
  );

  test.concurrent('report with a non-UUID graph id is rejected', async ({ expect }) => {
    const { accessToken } = await createTargetWithAccessToken();

    const response = await sendUsageReportV2(accessToken, {
      size: 1,
      map: {
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 150_000_000,
            errorsTotal: 0,
          },
          metadata: {
            graph: { graphId: 'not-a-uuid', graphVersionId: randomUUID() },
          },
        },
      ],
    });
    expect(response.status).toBe(400);
  });

  test.concurrent(
    'subscription report with a non-UUID graph id is rejected',
    async ({ expect }) => {
      const { accessToken } = await createTargetWithAccessToken();

      const response = await sendUsageReportV2(accessToken, {
        size: 1,
        map: {
          a1b2c3d4: {
            operationName: 'onUser',
            operation: 'subscription onUser { user { id name } }',
            fields: ['Subscription', 'Subscription.user', 'User', 'User.id', 'User.name'],
          },
        },
        subscriptionOperations: [
          {
            operationMapKey: 'a1b2c3d4',
            timestamp: Date.now(),
            metadata: {
              graph: { graphId: 'not-a-uuid', graphVersionId: randomUUID() },
            },
          },
        ],
      });
      expect(response.status).toBe(400);
    },
  );
});
