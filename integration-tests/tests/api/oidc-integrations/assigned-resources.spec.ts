import { graphql } from 'testkit/gql';
import { ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';

const AssignedResourcesSpec_CreateOIDCIntegrationMutation = graphql(`
  mutation AssignedResourcesSpec_CreateOIDCIntegrationMutation(
    $input: CreateOIDCIntegrationInput!
  ) {
    createOIDCIntegration(input: $input) {
      ok {
        createdOIDCIntegration {
          id
          defaultResourceAssignment {
            mode
          }
        }
      }
    }
  }
`);

const AssignedResourcesSpec_ReadDefaultTest = graphql(`
  query AssignedResourcesSpec_ReadDefaultTest($organizationSlug: String!) {
    organization(reference: { bySelector: { organizationSlug: $organizationSlug } }) {
      id
      oidcIntegration {
        defaultResourceAssignment {
          mode
          projects {
            project {
              id
              slug
            }
            targets {
              mode
              targets {
                target {
                  id
                  slug
                }
                services {
                  mode
                  services
                }
                appDeployments {
                  mode
                  appDeployments
                }
              }
            }
          }
        }
      }
    }
  }
`);

const AssignedResourcesSpec_UpdateDefaultMutation = graphql(`
  mutation AssignedResourcesSpec_UpdateDefaultMutation(
    $input: UpdateOIDCDefaultResourceAssignmentInput!
  ) {
    updateOIDCDefaultResourceAssignment(input: $input) {
      ok {
        updatedOIDCIntegration {
          id
          defaultResourceAssignment {
            mode
            projects {
              project {
                id
                slug
              }
              targets {
                mode
                targets {
                  target {
                    id
                    slug
                  }
                  services {
                    mode
                    services
                  }
                  appDeployments {
                    mode
                    appDeployments
                  }
                }
              }
            }
          }
        }
      }
      error {
        message
      }
    }
  }
`);

async function setup() {
  const { ownerToken, createOrg } = await initSeed().createOwner();
  const { organization, createOrganizationAccessToken } = await createOrg();

  const result = await execute({
    document: AssignedResourcesSpec_CreateOIDCIntegrationMutation,
    variables: {
      input: {
        organizationId: organization.id,
        clientId: 'foo',
        clientSecret: 'foofoofoofoo',
        tokenEndpoint: 'http://localhost:8888/oauth/token',
        userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
        authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
        additionalScopes: [],
      },
    },
    authToken: ownerToken,
  }).then(r => r.expectNoGraphQLErrors());

  // no default exists at creation
  expect(result.createOIDCIntegration.ok?.createdOIDCIntegration.defaultResourceAssignment).toBe(
    null,
  );
  return {
    organization,
    ownerToken,
    oidcIntegrationId: result.createOIDCIntegration.ok?.createdOIDCIntegration.id!,
    createOrganizationAccessToken,
  };
}

describe('read OIDC', () => {
  describe('permissions="organization:integrations"', () => {
    test.concurrent('success', async ({ expect }) => {
      const { organization, ownerToken, oidcIntegrationId } = await setup();

      await execute({
        document: AssignedResourcesSpec_UpdateDefaultMutation,
        variables: {
          input: {
            oidcIntegrationId,
            resources: {
              mode: ResourceAssignmentModeType.All,
            },
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      const read = await execute({
        document: AssignedResourcesSpec_ReadDefaultTest,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(read).toEqual({
        organization: {
          id: expect.stringMatching('.+'),
          oidcIntegration: {
            defaultResourceAssignment: {
              mode: 'ALL',
              projects: null,
            },
          },
        },
      });
    });
  });

  describe('permissions missing "organization:integrations"', () => {
    test.concurrent('fail', async ({ expect }) => {
      const { organization, ownerToken, oidcIntegrationId, createOrganizationAccessToken } =
        await setup();
      const { privateAccessKey: readToken } = await createOrganizationAccessToken({
        permissions: ['organization:read'],
        resources: { mode: ResourceAssignmentModeType.All },
      });

      await execute({
        document: AssignedResourcesSpec_UpdateDefaultMutation,
        variables: {
          input: {
            oidcIntegrationId,
            resources: {
              mode: ResourceAssignmentModeType.All,
            },
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      const errors = await execute({
        document: AssignedResourcesSpec_ReadDefaultTest,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: readToken,
      }).then(r => r.expectGraphQLErrors());
      expect(errors).toHaveLength(1);
      expect(errors).toMatchObject([
        {
          extensions: {
            code: 'UNAUTHORISED',
          },
          message: `No access (reason: "Missing permission for performing 'organization:describe' on resource")`,
          path: ['organization'],
        },
      ]);
    });
  });
});

describe('update OIDC default assigned resources', () => {
  describe('permissions="oidc:modify"', () => {
    test.concurrent('success', async ({ expect }) => {
      const { ownerToken, oidcIntegrationId } = await setup();

      const update = await execute({
        document: AssignedResourcesSpec_UpdateDefaultMutation,
        variables: {
          input: {
            oidcIntegrationId,
            resources: {
              mode: ResourceAssignmentModeType.All,
            },
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(update).toEqual({
        updateOIDCDefaultResourceAssignment: {
          error: null,
          ok: {
            updatedOIDCIntegration: {
              defaultResourceAssignment: {
                mode: 'ALL',
                projects: null,
              },
              id: expect.stringMatching('.+'),
            },
          },
        },
      });
    });
  });

  describe('permissions missing "oidc:modify"', () => {
    test.concurrent('fails', async ({ expect }) => {
      const { createOrganizationAccessToken, ownerToken, oidcIntegrationId } = await setup();

      const { privateAccessKey: accessToken } = await createOrganizationAccessToken({
        permissions: ['organization:read'],
        resources: {
          mode: ResourceAssignmentModeType.All,
        },
      });

      const errors = await execute({
        document: AssignedResourcesSpec_UpdateDefaultMutation,
        variables: {
          input: {
            oidcIntegrationId,
            resources: {
              mode: ResourceAssignmentModeType.All,
            },
          },
        },
        authToken: accessToken,
      }).then(r => r.expectGraphQLErrors());
      expect(errors).toHaveLength(1);
      expect(errors).toMatchObject([
        {
          extensions: {
            code: 'UNAUTHORISED',
          },
          message: `No access (reason: "Missing permission for performing 'oidc:modify' on resource")`,
          path: ['updateOIDCDefaultResourceAssignment'],
        },
      ]);
    });
  });
});
