import { initSeed } from 'testkit/seed';
import { ResourceAssignmentModeType } from '../../testkit/gql/graphql';
import { getServiceHost } from '../../testkit/utils';

test('/:targetId > operation is accepted with wildcard access token', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken } = await createOrg();
  const { target } = await createProject();

  const usageAddress = await getServiceHost('usage', 8081);

  const accessToken = await createOrganizationAccessToken({
    permissions: ['usage:report'],
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  const response = await fetch(`http://${usageAddress}/${target.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-usage-api-version': '2',
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

test('/:targetId > operation is denied without access to target', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken } = await createOrg();
  const { project, target } = await createProject();

  const usageAddress = await getServiceHost('usage', 8081);

  const accessToken = await createOrganizationAccessToken({
    permissions: ['usage:report'],
    resources: {
      mode: ResourceAssignmentModeType.Granular,
      projects: [
        {
          projectId: project.id,
          targets: {
            mode: ResourceAssignmentModeType.Granular,
            targets: [],
          },
        },
      ],
    },
  });

  const response = await fetch(`http://${usageAddress}/${target.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-usage-api-version': '2',
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
  expect(response.status).toBe(403);
  expect(await response.text()).toMatchInlineSnapshot(`No access`);
});

test('/:targetId > operation is accepted with specific access to target', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken } = await createOrg();
  const { project, target } = await createProject();

  const usageAddress = await getServiceHost('usage', 8081);

  const accessToken = await createOrganizationAccessToken({
    permissions: ['usage:report'],
    resources: {
      mode: ResourceAssignmentModeType.Granular,
      projects: [
        {
          projectId: project.id,
          targets: {
            mode: ResourceAssignmentModeType.Granular,
            targets: [
              {
                targetId: target.id,
                services: {
                  services: [],
                  mode: ResourceAssignmentModeType.Granular,
                },
                appDeployments: {
                  appDeployments: [],
                  mode: ResourceAssignmentModeType.Granular,
                },
              },
            ],
          },
        },
      ],
    },
  });

  const response = await fetch(`http://${usageAddress}/${target.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-usage-api-version': '2',
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

test('/:orgSlug/:projectSlug/:targetSlug > operation is accepted with wildcard access token', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { organization, createProject, createOrganizationAccessToken } = await createOrg();
  const { project, target } = await createProject();

  const usageAddress = await getServiceHost('usage', 8081);

  const accessToken = await createOrganizationAccessToken({
    permissions: ['usage:report'],
    resources: {
      mode: ResourceAssignmentModeType.All,
    },
  });

  const response = await fetch(
    `http://${usageAddress}/${organization.slug}/${project.slug}/${target.slug}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-usage-api-version': '2',
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
    },
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 1,
      rejected: 0,
    },
  });
});

test('/:orgSlug/:projectSlug/:targetSlug > operation is denied without access to target', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { organization, createProject, createOrganizationAccessToken } = await createOrg();
  const { project, target } = await createProject();

  const usageAddress = await getServiceHost('usage', 8081);

  const accessToken = await createOrganizationAccessToken({
    permissions: ['usage:report'],
    resources: {
      mode: ResourceAssignmentModeType.Granular,
      projects: [
        {
          projectId: project.id,
          targets: {
            mode: ResourceAssignmentModeType.Granular,
            targets: [],
          },
        },
      ],
    },
  });

  const response = await fetch(
    `http://${usageAddress}/${organization.slug}/${project.slug}/${target.slug}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-usage-api-version': '2',
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
    },
  );
  expect(response.status).toBe(403);
  expect(await response.text()).toMatchInlineSnapshot(`No access`);
});

test('/:orgSlug/:projectSlug/:targetSlug > operation is accepted with specific access to target', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { organization, createProject, createOrganizationAccessToken } = await createOrg();
  const { project, target } = await createProject();

  const usageAddress = await getServiceHost('usage', 8081);

  const accessToken = await createOrganizationAccessToken({
    permissions: ['usage:report'],
    resources: {
      mode: ResourceAssignmentModeType.Granular,
      projects: [
        {
          projectId: project.id,
          targets: {
            mode: ResourceAssignmentModeType.Granular,
            targets: [
              {
                targetId: target.id,
                services: {
                  services: [],
                  mode: ResourceAssignmentModeType.Granular,
                },
                appDeployments: {
                  appDeployments: [],
                  mode: ResourceAssignmentModeType.Granular,
                },
              },
            ],
          },
        },
      ],
    },
  });

  const response = await fetch(
    `http://${usageAddress}/${organization.slug}/${project.slug}/${target.slug}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-usage-api-version': '2',
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
    },
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: expect.any(String),
    operations: {
      accepted: 1,
      rejected: 0,
    },
  });
});
