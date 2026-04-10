import { userEmail } from 'testkit/auth';
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const OrganizationWithOIDCIntegration = graphql(`
  query OrganizationWithOIDCIntegration($organizationSlug: String!) {
    organization(reference: { bySelector: { organizationSlug: $organizationSlug } }) {
      id
      oidcIntegration {
        id
        oidcUserJoinOnly
        oidcUserAccessOnly
        tokenEndpoint
      }
    }
  }
`);

const OrganizationReadTest = graphql(`
  query OrganizationReadTest($organizationSlug: String!) {
    organization(reference: { bySelector: { organizationSlug: $organizationSlug } }) {
      id
    }
  }
`);

const CreateOIDCIntegrationMutation = graphql(`
  mutation CreateOIDCIntegrationMutation($input: CreateOIDCIntegrationInput!) {
    createOIDCIntegration(input: $input) {
      ok {
        createdOIDCIntegration {
          id
          clientId
          clientSecretPreview
          tokenEndpoint
          userinfoEndpoint
          authorizationEndpoint
          additionalScopes
          oidcUserJoinOnly
          oidcUserAccessOnly
        }
      }
      error {
        message
        details {
          clientId
          clientSecret
          tokenEndpoint
          userinfoEndpoint
          authorizationEndpoint
          additionalScopes
        }
      }
    }
  }
`);

const UpdateOIDCRestrictionsMutation = graphql(`
  mutation UpdateOIDCRestrictionsMutation($input: UpdateOIDCRestrictionsInput!) {
    updateOIDCRestrictions(input: $input) {
      ok {
        updatedOIDCIntegration {
          id
          oidcUserJoinOnly
          oidcUserAccessOnly
        }
      }
      error {
        message
      }
    }
  }
`);

describe('create', () => {
  describe('permissions="organization:integrations"', () => {
    test.concurrent('success', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const result = await execute({
        document: CreateOIDCIntegrationMutation,
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

      expect(result).toEqual({
        createOIDCIntegration: {
          error: null,
          ok: {
            createdOIDCIntegration: {
              id: expect.any(String),
              clientId: 'foo',
              clientSecretPreview: 'ofoo',
              tokenEndpoint: 'http://localhost:8888/oauth/token',
              userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
              authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
              oidcUserJoinOnly: true,
              oidcUserAccessOnly: false,
              additionalScopes: [],
            },
          },
        },
      });

      const refetchedOrg = await execute({
        document: OrganizationWithOIDCIntegration,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(refetchedOrg).toEqual({
        organization: {
          id: organization.id,
          oidcIntegration: {
            id: result.createOIDCIntegration.ok!.createdOIDCIntegration.id,
            oidcUserJoinOnly: true,
            oidcUserAccessOnly: false,
            tokenEndpoint: 'http://localhost:8888/oauth/token',
          },
        },
      });
    });

    test.concurrent('error: non existing organization', async ({ expect }) => {
      const { ownerToken } = await initSeed().createOwner();
      const errors = await execute({
        document: CreateOIDCIntegrationMutation,
        variables: {
          input: {
            organizationId: 'i-do-not-exist',
            clientId: 'fo',
            clientSecret: 'foofoofoofoo',
            tokenEndpoint: 'http://localhost:8888/oauth/token',
            userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
            authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
            additionalScopes: [],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectGraphQLErrors());

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: `No access (reason: "Missing permission for performing 'oidc:modify' on resource")`,
          }),
        ]),
      );
    });

    test.concurrent('error: too short clientId', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const result = await execute({
        document: CreateOIDCIntegrationMutation,
        variables: {
          input: {
            organizationId: organization.id,
            clientId: 'fo',
            clientSecret: 'foofoofoofoo',
            tokenEndpoint: 'http://localhost:8888/oauth/token',
            userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
            authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
            additionalScopes: [],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(result).toMatchInlineSnapshot(`
        {
          createOIDCIntegration: {
            error: {
              details: {
                additionalScopes: null,
                authorizationEndpoint: null,
                clientId: Must be at least 3 characters long.,
                clientSecret: null,
                tokenEndpoint: null,
                userinfoEndpoint: null,
              },
              message: Failed to create OIDC Integration.,
            },
            ok: null,
          },
        }
      `);
    });

    test.concurrent('error: too long clientId', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const result = await execute({
        document: CreateOIDCIntegrationMutation,
        variables: {
          input: {
            organizationId: organization.id,
            clientId: new Array(101).fill('a').join(''),
            clientSecret: 'foofoofoofoo',
            tokenEndpoint: 'http://localhost:8888/oauth/token',
            userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
            authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
            additionalScopes: [],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(result).toMatchInlineSnapshot(`
        {
          createOIDCIntegration: {
            error: {
              details: {
                additionalScopes: null,
                authorizationEndpoint: null,
                clientId: Can not be longer than 100 characters.,
                clientSecret: null,
                tokenEndpoint: null,
                userinfoEndpoint: null,
              },
              message: Failed to create OIDC Integration.,
            },
            ok: null,
          },
        }
      `);
    });

    test.concurrent('error: too short clientSecret', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const result = await execute({
        document: CreateOIDCIntegrationMutation,
        variables: {
          input: {
            organizationId: organization.id,
            clientId: 'foo',
            clientSecret: 'fo',
            tokenEndpoint: 'http://localhost:8888/oauth/token',
            userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
            authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
            additionalScopes: [],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(result).toMatchInlineSnapshot(`
        {
          createOIDCIntegration: {
            error: {
              details: {
                additionalScopes: null,
                authorizationEndpoint: null,
                clientId: null,
                clientSecret: Must be at least 3 characters long.,
                tokenEndpoint: null,
                userinfoEndpoint: null,
              },
              message: Failed to create OIDC Integration.,
            },
            ok: null,
          },
        }
      `);
    });

    test.concurrent('error: too long clientSecret', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const result = await execute({
        document: CreateOIDCIntegrationMutation,
        variables: {
          input: {
            organizationId: organization.id,
            clientId: 'foo',
            clientSecret: new Array(500).fill('a').join(''),
            tokenEndpoint: 'http://localhost:8888/oauth/token',
            userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
            authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
            additionalScopes: [],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(result).toMatchInlineSnapshot(`
        {
          createOIDCIntegration: {
            error: {
              details: {
                additionalScopes: null,
                authorizationEndpoint: null,
                clientId: null,
                clientSecret: Can not be longer than 200 characters.,
                tokenEndpoint: null,
                userinfoEndpoint: null,
              },
              message: Failed to create OIDC Integration.,
            },
            ok: null,
          },
        }
      `);
    });

    test.concurrent('error: invalid oauth api url', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const result = await execute({
        document: CreateOIDCIntegrationMutation,
        variables: {
          input: {
            organizationId: organization.id,
            clientId: 'foo',
            clientSecret: 'foo',
            tokenEndpoint: 'foo',
            userinfoEndpoint: 'foo',
            authorizationEndpoint: 'foo',
            additionalScopes: [],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(result).toMatchInlineSnapshot(`
        {
          createOIDCIntegration: {
            error: {
              details: {
                additionalScopes: null,
                authorizationEndpoint: Must be a valid OAuth API url.,
                clientId: null,
                clientSecret: null,
                tokenEndpoint: Must be a valid OAuth API url.,
                userinfoEndpoint: Must be a valid OAuth API url.,
              },
              message: Failed to create OIDC Integration.,
            },
            ok: null,
          },
        }
      `);
    });

    test.concurrent('error: multiple integrations per organization', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const result = await execute({
        document: CreateOIDCIntegrationMutation,
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

      expect(result).toEqual({
        createOIDCIntegration: {
          error: null,
          ok: {
            createdOIDCIntegration: {
              id: expect.any(String),
              clientId: 'foo',
              clientSecretPreview: 'ofoo',
              tokenEndpoint: 'http://localhost:8888/oauth/token',
              userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
              authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
              oidcUserJoinOnly: true,
              oidcUserAccessOnly: false,
              additionalScopes: [],
            },
          },
        },
      });

      const result2 = await execute({
        document: CreateOIDCIntegrationMutation,
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

      expect(result2).toEqual({
        createOIDCIntegration: {
          error: {
            message: 'An OIDC integration already exists for this organization.',
            details: {
              clientId: null,
              clientSecret: null,
              tokenEndpoint: null,
              userinfoEndpoint: null,
              authorizationEndpoint: null,
              additionalScopes: null,
            },
          },
          ok: null,
        },
      });
    });
  });
});

const DeleteOIDCIntegrationMutation = graphql(`
  mutation DeleteOIDCIntegrationMutation($input: DeleteOIDCIntegrationInput!) {
    deleteOIDCIntegration(input: $input) {
      ok {
        __typename
      }
      error {
        message
      }
    }
  }
`);

describe('delete', () => {
  describe('permissions="organization:integrations"', () => {
    test.concurrent('success', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const createResult = await execute({
        document: CreateOIDCIntegrationMutation,
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

      const oidcIntegrationId = createResult.createOIDCIntegration.ok!.createdOIDCIntegration.id;

      let refetchedOrg = await execute({
        document: OrganizationWithOIDCIntegration,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(refetchedOrg).toEqual({
        organization: {
          id: organization.id,
          oidcIntegration: {
            id: oidcIntegrationId,
            oidcUserJoinOnly: true,
            oidcUserAccessOnly: false,
            tokenEndpoint: 'http://localhost:8888/oauth/token',
          },
        },
      });

      const deleteResult = await execute({
        document: DeleteOIDCIntegrationMutation,
        variables: {
          input: {
            oidcIntegrationId,
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(deleteResult).toEqual({
        deleteOIDCIntegration: {
          error: null,
          ok: {
            __typename: 'DeleteOIDCIntegrationOk',
          },
        },
      });

      refetchedOrg = await execute({
        document: OrganizationWithOIDCIntegration,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(refetchedOrg).toEqual({
        organization: {
          id: organization.id,
          oidcIntegration: null,
        },
      });
    });

    test("error: user doesn't have permissions", async () => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const createResult = await execute({
        document: CreateOIDCIntegrationMutation,
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

      const oidcIntegrationId = createResult.createOIDCIntegration.ok!.createdOIDCIntegration.id;

      const { ownerToken: accessTokenExtra } = await initSeed().createOwner();

      const errors = await execute({
        document: DeleteOIDCIntegrationMutation,
        variables: {
          input: {
            oidcIntegrationId,
          },
        },
        authToken: accessTokenExtra,
      }).then(r => r.expectGraphQLErrors());

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: `No access (reason: "Missing permission for performing 'oidc:modify' on resource")`,
          }),
        ]),
      );
    });
  });
});

const UpdateOIDCIntegrationMutation = graphql(`
  mutation UpdateOIDCIntegrationMutation($input: UpdateOIDCIntegrationInput!) {
    updateOIDCIntegration(input: $input) {
      ok {
        updatedOIDCIntegration {
          id
          tokenEndpoint
          userinfoEndpoint
          authorizationEndpoint
          clientId
          clientSecretPreview
          additionalScopes
        }
      }
      error {
        message
        details {
          clientId
          clientSecret
          tokenEndpoint
          userinfoEndpoint
          authorizationEndpoint
          additionalScopes
        }
      }
    }
  }
`);

describe('update', () => {
  describe('permissions="organization:integrations"', () => {
    test.concurrent('success', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const createResult = await execute({
        document: CreateOIDCIntegrationMutation,
        variables: {
          input: {
            organizationId: organization.id,
            clientId: 'aaaa',
            clientSecret: 'aaaaaaaaaaaa',
            tokenEndpoint: 'http://localhost:8888/aaaa/token',
            userinfoEndpoint: 'http://localhost:8888/aaaa/userinfo',
            authorizationEndpoint: 'http://localhost:8888/aaaa/authorize',
            additionalScopes: [],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      const oidcIntegrationId = createResult.createOIDCIntegration.ok!.createdOIDCIntegration.id;

      const updateResult = await execute({
        document: UpdateOIDCIntegrationMutation,
        variables: {
          input: {
            oidcIntegrationId,
            clientId: 'bbbb',
            clientSecret: 'bbbbbbbbbbbb',
            tokenEndpoint: 'http://localhost:8888/bbbb/token',
            userinfoEndpoint: 'http://localhost:8888/bbbb/userinfo',
            authorizationEndpoint: 'http://localhost:8888/bbbb/authorize',
            additionalScopes: ['profile'],
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(updateResult).toEqual({
        updateOIDCIntegration: {
          error: null,
          ok: {
            updatedOIDCIntegration: {
              id: oidcIntegrationId,
              clientId: 'bbbb',
              clientSecretPreview: 'bbbb',
              tokenEndpoint: 'http://localhost:8888/bbbb/token',
              userinfoEndpoint: 'http://localhost:8888/bbbb/userinfo',
              authorizationEndpoint: 'http://localhost:8888/bbbb/authorize',
              additionalScopes: ['profile'],
            },
          },
        },
      });
    });

    test.concurrent('error: user does not have permissions', async ({ expect }) => {
      const { ownerToken, createOrg } = await initSeed().createOwner();
      const { organization } = await createOrg();

      const createResult = await execute({
        document: CreateOIDCIntegrationMutation,
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

      const oidcIntegrationId = createResult.createOIDCIntegration.ok!.createdOIDCIntegration.id;
      const { ownerToken: accessTokenExtra } = await initSeed().createOwner();

      const errors = await execute({
        document: UpdateOIDCIntegrationMutation,
        variables: {
          input: {
            oidcIntegrationId,
          },
        },
        authToken: accessTokenExtra,
      }).then(r => r.expectGraphQLErrors());

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: `No access (reason: "Missing permission for performing 'oidc:modify' on resource")`,
          }),
        ]),
      );
    });
  });
});

describe('restrictions', () => {
  async function configureOIDC(args: { ownerToken: string; organizationId: string }) {
    const result = await execute({
      document: CreateOIDCIntegrationMutation,
      variables: {
        input: {
          organizationId: args.organizationId,
          clientId: 'foo',
          clientSecret: 'foofoofoofoo',
          tokenEndpoint: 'http://localhost:8888/oauth/token',
          userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
          authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
          additionalScopes: [],
        },
      },
      authToken: args.ownerToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result).toEqual({
      createOIDCIntegration: {
        error: null,
        ok: {
          createdOIDCIntegration: {
            id: expect.any(String),
            oidcUserJoinOnly: true,
            oidcUserAccessOnly: false,
            clientId: 'foo',
            clientSecretPreview: 'ofoo',
            tokenEndpoint: 'http://localhost:8888/oauth/token',
            userinfoEndpoint: 'http://localhost:8888/oauth/userinfo',
            authorizationEndpoint: 'http://localhost:8888/oauth/authorize',
            additionalScopes: [],
          },
        },
      },
    });

    return result.createOIDCIntegration.ok!.createdOIDCIntegration.id;
  }

  test.concurrent(
    'users authorized with non-OIDC method cannot join an organization (default)',
    async ({ expect }) => {
      const seed = initSeed();
      const { ownerToken, createOrg } = await seed.createOwner();
      const { organization, inviteMember, joinMemberUsingCode } = await createOrg();

      await configureOIDC({
        ownerToken,
        organizationId: organization.id,
      });

      const refetchedOrg = await execute({
        document: OrganizationWithOIDCIntegration,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(refetchedOrg.organization?.oidcIntegration?.oidcUserJoinOnly).toEqual(true);

      const email = userEmail('non-oidc-user');
      const invitation = await inviteMember(email);
      const invitationCode = invitation.ok?.createdOrganizationInvitation.code;

      if (!invitationCode) {
        throw new Error('No invitation code');
      }

      const nonOidcAccount = await seed.authenticate(email);
      const joinResult = await joinMemberUsingCode(
        invitationCode,
        nonOidcAccount.access_token,
      ).then(r => r.expectGraphQLErrors());

      expect(joinResult).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            extensions: expect.objectContaining({
              code: 'NEEDS_OIDC',
            }),
          }),
        ]),
      );
    },
  );

  test.concurrent('non-oidc users can join an organization (opt-in)', async ({ expect }) => {
    const seed = initSeed();
    const { ownerToken, createOrg } = await seed.createOwner();
    const { organization, inviteMember, joinMemberUsingCode } = await createOrg();

    const oidcIntegrationId = await configureOIDC({
      ownerToken,
      organizationId: organization.id,
    });

    const orgAfterOidc = await execute({
      document: OrganizationWithOIDCIntegration,
      variables: {
        organizationSlug: organization.slug,
      },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(orgAfterOidc.organization?.oidcIntegration?.oidcUserJoinOnly).toEqual(true);

    const restrictionsUpdateResult = await execute({
      document: UpdateOIDCRestrictionsMutation,
      variables: {
        input: {
          oidcIntegrationId,
          oidcUserJoinOnly: false,
        },
      },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(
      restrictionsUpdateResult.updateOIDCRestrictions.ok?.updatedOIDCIntegration.oidcUserJoinOnly,
    ).toEqual(false);

    const orgAfterDisablingOidcRestrictions = await execute({
      document: OrganizationWithOIDCIntegration,
      variables: {
        organizationSlug: organization.slug,
      },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(
      orgAfterDisablingOidcRestrictions.organization?.oidcIntegration?.oidcUserJoinOnly,
    ).toEqual(false);

    const email = userEmail('non-oidc-user');
    const invitation = await inviteMember(email);
    const invitationCode = invitation.ok?.createdOrganizationInvitation.code;

    if (!invitationCode) {
      throw new Error('No invitation code');
    }

    const nonOidcAccount = await seed.authenticate(email);
    const joinResult = await joinMemberUsingCode(invitationCode, nonOidcAccount.access_token).then(
      r => r.expectNoGraphQLErrors(),
    );

    expect(joinResult.joinOrganization.__typename).toEqual('OrganizationPayload');
  });

  test.concurrent(
    'existing non-oidc users can access the organization (default)',
    async ({ expect }) => {
      const seed = initSeed();
      const { ownerToken, createOrg } = await seed.createOwner();
      const { organization, inviteMember, joinMemberUsingCode } = await createOrg();

      const email = userEmail('non-oidc-user');
      const invitation = await inviteMember(email);
      const invitationCode = invitation.ok?.createdOrganizationInvitation.code;

      if (!invitationCode) {
        throw new Error('No invitation code');
      }

      const nonOidcAccount = await seed.authenticate(email);
      const joinResult = await joinMemberUsingCode(
        invitationCode,
        nonOidcAccount.access_token,
      ).then(r => r.expectNoGraphQLErrors());

      expect(joinResult.joinOrganization.__typename).toEqual('OrganizationPayload');

      await configureOIDC({
        ownerToken,
        organizationId: organization.id,
      });

      const readAccessCheck = await execute({
        document: OrganizationReadTest,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(readAccessCheck.organization?.id).toEqual(organization.id);
    },
  );

  test.concurrent(
    'existing non-oidc users should lose access to the organization (opt-in)',
    async ({ expect }) => {
      const seed = initSeed();
      const { ownerToken, createOrg } = await seed.createOwner();
      const { organization, inviteMember, joinMemberUsingCode } = await createOrg();

      const email = userEmail('non-oidc-user');
      const invitation = await inviteMember(email);
      const invitationCode = invitation.ok?.createdOrganizationInvitation.code;

      if (!invitationCode) {
        throw new Error('No invitation code');
      }

      const nonOidcAccount = await seed.authenticate(email);
      const joinResult = await joinMemberUsingCode(
        invitationCode,
        nonOidcAccount.access_token,
      ).then(r => r.expectNoGraphQLErrors());

      expect(joinResult.joinOrganization.__typename).toEqual('OrganizationPayload');

      const oidcIntegrationId = await configureOIDC({
        ownerToken,
        organizationId: organization.id,
      });

      const orgAfterOidc = await execute({
        document: OrganizationWithOIDCIntegration,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(orgAfterOidc.organization?.oidcIntegration?.oidcUserAccessOnly).toEqual(false);

      const restrictionsUpdateResult = await execute({
        document: UpdateOIDCRestrictionsMutation,
        variables: {
          input: {
            oidcIntegrationId,
            oidcUserAccessOnly: true,
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(
        restrictionsUpdateResult.updateOIDCRestrictions.ok?.updatedOIDCIntegration
          .oidcUserAccessOnly,
      ).toEqual(true);

      const orgAfterEnablingOidcRestrictions = await execute({
        document: OrganizationWithOIDCIntegration,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(
        orgAfterEnablingOidcRestrictions.organization?.oidcIntegration?.oidcUserAccessOnly,
      ).toEqual(true);

      const orgReadErrors = await execute({
        document: OrganizationReadTest,
        variables: {
          organizationSlug: organization.slug,
        },
        authToken: nonOidcAccount.access_token,
      }).then(r => r.expectGraphQLErrors());
      expect(orgReadErrors.some(e => e.message.includes('requires OIDC'))).toBe(true);
    },
  );
});

test.concurrent(
  'Organization.oidcIntegration resolves to null without error if user does not have oidc:modify permission',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await seed.createOwner();
    const { organization, inviteAndJoinMember } = await createOrg();

    const createOIDCIntegrationResult = await execute({
      document: CreateOIDCIntegrationMutation,
      variables: {
        input: {
          organizationId: organization.id,
          clientId: 'aaaa',
          clientSecret: 'aaaaaaaaaaaa',
          tokenEndpoint: 'http://localhost:8888/aaaa/token',
          userinfoEndpoint: 'http://localhost:8888/aaaa/userinfo',
          authorizationEndpoint: 'http://localhost:8888/aaaa/authorize',
          additionalScopes: [],
        },
      },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());
    const oidcIntegrationId =
      createOIDCIntegrationResult.createOIDCIntegration.ok?.createdOIDCIntegration.id;

    const { createMemberRole, assignMemberRole, updateMemberRole, memberToken, member } =
      await inviteAndJoinMember({ oidcIntegrationId });
    const role = await createMemberRole([]);
    await assignMemberRole({ roleId: role.id, userId: member.id });

    let result = await execute({
      document: OrganizationWithOIDCIntegration,
      variables: {
        organizationSlug: organization.slug,
      },
      authToken: memberToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.organization!.oidcIntegration).toEqual(null);

    await updateMemberRole(role, ['oidc:modify']);

    result = await execute({
      document: OrganizationWithOIDCIntegration,
      variables: {
        organizationSlug: organization.slug,
      },
      authToken: memberToken,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.organization!.oidcIntegration).not.toEqual(null);
  },
);
