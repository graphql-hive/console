import { resolveResourceAssignment } from './organization-members';

describe('resolveResourceAssignment', () => {
  test('project wildcard: organization wide access to all resources', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: '*',
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: {
        organizationId: 'aaa',
        type: 'organization',
      },
      target: {
        organizationId: 'aaa',
        type: 'organization',
      },
      service: {
        organizationId: 'aaa',
        type: 'organization',
      },
      appDeployment: {
        organizationId: 'aaa',
        type: 'organization',
      },
    });
  });
  test('project granular: access to single project', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: { mode: '*' },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      target: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      service: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      appDeployment: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
    });
  });
  test('project granular: access to multiple projects', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: { mode: '*' },
              type: 'project',
            },
            {
              id: 'ccc',
              targets: { mode: '*' },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
        {
          projectId: 'ccc',
          type: 'project',
        },
      ],
      target: [
        {
          projectId: 'bbb',
          type: 'project',
        },
        {
          projectId: 'ccc',
          type: 'project',
        },
      ],
      service: [
        {
          projectId: 'bbb',
          type: 'project',
        },
        {
          projectId: 'ccc',
          type: 'project',
        },
      ],
      appDeployment: [
        {
          projectId: 'bbb',
          type: 'project',
        },
        {
          projectId: 'ccc',
          type: 'project',
        },
      ],
    });
  });
  test('target granular: access to single target', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: {
                mode: 'granular',
                targets: [
                  {
                    id: 'ccc',
                    type: 'target',
                    appDeployments: { mode: '*' },
                    services: { mode: '*' },
                  },
                ],
              },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      target: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
      service: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
      appDeployment: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
    });
  });
  test('target granular: access to multiple targets', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: {
                mode: 'granular',
                targets: [
                  {
                    id: 'ccc',
                    type: 'target',
                    appDeployments: { mode: '*' },
                    services: { mode: '*' },
                  },
                  {
                    id: 'ddd',
                    type: 'target',
                    appDeployments: { mode: '*' },
                    services: { mode: '*' },
                  },
                ],
              },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      target: [
        {
          targetId: 'ccc',
          type: 'target',
        },
        {
          targetId: 'ddd',
          type: 'target',
        },
      ],
      service: [
        {
          targetId: 'ccc',
          type: 'target',
        },
        {
          targetId: 'ddd',
          type: 'target',
        },
      ],
      appDeployment: [
        {
          targetId: 'ccc',
          type: 'target',
        },
        {
          targetId: 'ddd',
          type: 'target',
        },
      ],
    });
  });
  test('service granular: access to single service', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: {
                mode: 'granular',
                targets: [
                  {
                    id: 'ccc',
                    type: 'target',
                    appDeployments: { mode: '*' },
                    services: {
                      mode: 'granular',
                      services: [
                        {
                          serviceName: 'my-service',
                          type: 'service',
                        },
                      ],
                    },
                  },
                ],
              },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      target: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
      service: [
        {
          serviceName: 'my-service',
          targetId: 'ccc',
          type: 'service',
        },
      ],
      appDeployment: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
    });
  });
  test('service granular: access to multiple services', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: {
                mode: 'granular',
                targets: [
                  {
                    id: 'ccc',
                    type: 'target',
                    appDeployments: { mode: '*' },
                    services: {
                      mode: 'granular',
                      services: [
                        {
                          serviceName: 'my-service',
                          type: 'service',
                        },
                        {
                          serviceName: 'my-other-service',
                          type: 'service',
                        },
                      ],
                    },
                  },
                ],
              },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      target: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
      service: [
        {
          serviceName: 'my-service',
          targetId: 'ccc',
          type: 'service',
        },
        {
          serviceName: 'my-other-service',
          targetId: 'ccc',
          type: 'service',
        },
      ],
      appDeployment: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
    });
  });
  test('app deployment granular: access to single app deployment', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: {
                mode: 'granular',
                targets: [
                  {
                    id: 'ccc',
                    type: 'target',
                    appDeployments: {
                      mode: 'granular',
                      appDeployments: [{ appName: 'my-app', type: 'appDeployment' }],
                    },
                    services: {
                      mode: 'granular',
                      services: [],
                    },
                  },
                ],
              },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      target: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
      service: [],
      appDeployment: [
        {
          targetId: 'ccc',
          appDeploymentName: 'my-app',
          type: 'appDeployment',
        },
      ],
    });
  });
  test('app deployment granular: access to multiple app deployments', () => {
    expect(
      resolveResourceAssignment({
        organizationId: 'aaa',
        projects: {
          mode: 'granular',
          projects: [
            {
              id: 'bbb',
              targets: {
                mode: 'granular',
                targets: [
                  {
                    id: 'ccc',
                    type: 'target',
                    appDeployments: {
                      mode: 'granular',
                      appDeployments: [
                        { appName: 'my-app', type: 'appDeployment' },
                        { appName: 'my-other-app', type: 'appDeployment' },
                      ],
                    },
                    services: {
                      mode: 'granular',
                      services: [],
                    },
                  },
                ],
              },
              type: 'project',
            },
          ],
        },
      }),
    ).toEqual({
      organization: {
        organizationId: 'aaa',
        type: 'organization',
      },
      project: [
        {
          projectId: 'bbb',
          type: 'project',
        },
      ],
      target: [
        {
          targetId: 'ccc',
          type: 'target',
        },
      ],
      service: [],
      appDeployment: [
        {
          targetId: 'ccc',
          appDeploymentName: 'my-app',
          type: 'appDeployment',
        },
        {
          targetId: 'ccc',
          appDeploymentName: 'my-other-app',
          type: 'appDeployment',
        },
      ],
    });
  });
});
