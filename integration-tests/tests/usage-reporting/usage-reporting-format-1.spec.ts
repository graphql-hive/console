import { initSeed } from 'testkit/seed';
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
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 0,
      rejected: 1,
    },
  });
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
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 0,
      rejected: 1,
    },
  });
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
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 0,
      rejected: 1,
    },
  });
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
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 0,
      rejected: 1,
    },
  });
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
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 0,
      rejected: 1,
    },
  });
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
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 0,
      rejected: 1,
    },
  });
});
