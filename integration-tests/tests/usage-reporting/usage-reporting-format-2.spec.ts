import { randomUUID } from 'node:crypto';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import z from 'zod';
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

const GraphColumnsRowsModel = z.array(
  z.object({
    client_name: z.string(),
    graph_id: z.string(),
    graph_version_id: z.string(),
  }),
);

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

function createReport(operations: Array<{ client: string; graph?: unknown }>) {
  return {
    size: operations.length,
    map: {
      c3b6d9b0: {
        operationName: 'me',
        operation: 'query me { me { id name } }',
        fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
      },
    },
    operations: operations.map(op => ({
      operationMapKey: 'c3b6d9b0',
      timestamp: Date.now(),
      execution: {
        ok: true,
        duration: 150_000_000,
        errorsTotal: 0,
      },
      metadata: {
        client: { name: op.client, version: '0.0.1' },
        graph: op.graph,
      },
    })),
  };
}

test.concurrent(
  'graph id and graph version id are ingested into ClickHouse',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
    const { secret: accessToken } = await createTargetAccessToken({});

    const graphId = randomUUID();
    const graphVersionId = randomUUID();

    const response = await sendUsageReportV2(
      accessToken,
      createReport([
        { client: 'with-graph', graph: { graphId, graphVersionId } },
        { client: 'without-graph' },
      ]),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      operations: { accepted: 2, rejected: 0 },
    });

    await waitForExpectations(async () => {
      const result = await clickHouseQuery(`
      SELECT client_name, graph_id, graph_version_id
      FROM operations
      WHERE target = '${target.id}'
      ORDER BY client_name
    `);

      expect(GraphColumnsRowsModel.parse(result.data)).toEqual([
        { client_name: 'with-graph', graph_id: graphId, graph_version_id: graphVersionId },
        { client_name: 'without-graph', graph_id: '', graph_version_id: '' },
      ]);
    });
  },
);

test.concurrent('report with a non-UUID graph id is rejected', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Single);
  const { secret: accessToken } = await createTargetAccessToken({});

  const response = await sendUsageReportV2(
    accessToken,
    createReport([
      { client: 'invalid-graph', graph: { graphId: 'not-a-uuid', graphVersionId: randomUUID() } },
    ]),
  );
  expect(response.status).toBe(400);
});

test.concurrent(
  'graph id and graph version id of subscription operations are ingested into ClickHouse',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
    const { secret: accessToken } = await createTargetAccessToken({});

    const graphId = randomUUID();
    const graphVersionId = randomUUID();

    const response = await sendUsageReportV2(accessToken, {
      size: 2,
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
            client: { name: 'with-graph', version: '0.0.1' },
            graph: { graphId, graphVersionId },
          },
        },
        {
          operationMapKey: 'a1b2c3d4',
          timestamp: Date.now(),
          metadata: {
            client: { name: 'without-graph', version: '0.0.1' },
          },
        },
      ],
    });
    expect(response.status).toBe(200);

    await waitForExpectations(async () => {
      const result = await clickHouseQuery(`
      SELECT client_name, graph_id, graph_version_id
      FROM subscription_operations
      WHERE target = '${target.id}'
      ORDER BY client_name
    `);

      expect(GraphColumnsRowsModel.parse(result.data)).toEqual([
        { client_name: 'with-graph', graph_id: graphId, graph_version_id: graphVersionId },
        { client_name: 'without-graph', graph_id: '', graph_version_id: '' },
      ]);
    });
  },
);

test.concurrent('subscription report with a non-UUID graph id is rejected', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Single);
  const { secret: accessToken } = await createTargetAccessToken({});

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
});
