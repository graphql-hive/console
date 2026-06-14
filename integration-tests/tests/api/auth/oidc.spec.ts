import { graphql } from 'testkit/gql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';
import { invariant } from '@hive/service-common';

const TestMeQuery = graphql(`
  query OIDC_TestMeQuery {
    me {
      id
      email
    }
  }
`);

test.concurrent(
  'User can sign in/up with OIDC provider and confirm their email',
  async ({ expect }) => {
    const seed = initSeed();
    const email = seed.generateEmail();
    const { createOrg } = await seed.createOwner();
    const { createOIDCIntegration } = await createOrg();

    const { createMockServerAndUpdateIntegrationEndpoints } = await createOIDCIntegration();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints();

    const auth = await oidc.runGetAuthorizationUrl();

    oidc.setUser({
      userIdClaim: 'test-user',
      email,
    });

    const result = await oidc.runSignInUp({
      state: auth.state,
    });
    console.log(result);
    invariant(result.type === 'success', 'Expected sign in up to succeed.');

    const [error] = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectGraphQLErrors());

    expect(error).toMatchObject({
      extensions: {
        code: 'VERIFY_EMAIL',
      },
      message: 'Your account is not verified. Please verify your email address.',
    });

    await oidc.confirmEmail(result.user);
    const meResult = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(meResult).toMatchObject({
      me: {
        email,
        id: expect.any(String),
      },
    });
  },
);

test.concurrent(
  'If the OIDC provider users email changes, the users email is updated upon login',
  async ({ expect }) => {
    const seed = initSeed();
    const oldEmail = seed.generateEmail();
    const newEmail = seed.generateEmail();
    const { createOrg } = await seed.createOwner();
    const { createOIDCIntegration } = await createOrg();

    const { createMockServerAndUpdateIntegrationEndpoints } = await createOIDCIntegration();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints();

    let auth = await oidc.runGetAuthorizationUrl();

    oidc.setUser({
      userIdClaim: 'test-user',
      email: oldEmail,
    });

    let result = await oidc.runSignInUp({
      state: auth.state,
    });
    invariant(result.type === 'success', 'Expected sign in/up to succeed.');
    await oidc.confirmEmail(result.user);

    let meResult = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(meResult).toMatchObject({
      me: {
        email: oldEmail,
        id: expect.any(String),
      },
    });

    auth = await oidc.runGetAuthorizationUrl();

    oidc.setUser({
      userIdClaim: 'test-user',
      email: newEmail,
    });

    result = await oidc.runSignInUp({
      state: auth.state,
    });
    invariant(result.type === 'success', 'Expected sign in/up to succeed.');
    await oidc.confirmEmail(result.user);

    meResult = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(meResult).toMatchObject({
      me: {
        email: newEmail,
        id: expect.any(String),
      },
    });
  },
);

test.concurrent(
  'User does not need to confirm their email if the domain is verified with the origanization',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createOIDCIntegration } = await createOrg();

    const { createMockServerAndUpdateIntegrationEndpoints, registerFakeDomain } =
      await createOIDCIntegration();
    const domain = await registerFakeDomain();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints();

    const email = 'foo@' + domain;

    let auth = await oidc.runGetAuthorizationUrl();

    oidc.setUser({
      userIdClaim: 'test-user',
      email,
    });

    const result = await oidc.runSignInUp({
      state: auth.state,
    });
    const meResult = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(meResult).toMatchObject({
      me: {
        email,
        id: expect.any(String),
      },
    });
  },
);

test.concurrent(
  'Custom user id claim is used instead of default sub claim if configured',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createOIDCIntegration } = await createOrg();

    const { createMockServerAndUpdateIntegrationEndpoints, registerFakeDomain } =
      await createOIDCIntegration();
    const domain = await registerFakeDomain();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints({
      userIdClaim: 'custom_user_id_claim',
    });

    const email = 'foo@' + domain;

    let auth = await oidc.runGetAuthorizationUrl();

    oidc.setUser({
      userIdScope: 'custom_user_id_claim',
      userIdClaim: 'test-user',
      email,
    });

    const result = await oidc.runSignInUp({
      state: auth.state,
    });
    const meResult = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(meResult).toMatchObject({
      me: {
        email,
        id: expect.any(String),
      },
    });
  },
);

test.concurrent(
  'Custom user id claim missing raises correct error response',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createOIDCIntegration } = await createOrg();

    const { createMockServerAndUpdateIntegrationEndpoints, registerFakeDomain } =
      await createOIDCIntegration();
    const domain = await registerFakeDomain();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints({
      userIdClaim: 'custom_user_id_claim',
    });

    const email = 'foo@' + domain;
    oidc.setUser({
      userIdScope: 'super_custom_user_id_claim',
      userIdClaim: 'test-user',
      email,
    });

    let auth = await oidc.runGetAuthorizationUrl();
    const result = await oidc.runSignInUp({
      state: auth.state,
    });

    invariant(result.type === 'error', 'Expected sign in/up to fail.');
    expect(result.body).toEqual({
      reason: 'Sign in failed. Please contact your organization administrator.',
      status: 'SIGN_IN_UP_NOT_ALLOWED',
    });
  },
);

test.concurrent(
  'User cannot sign up with email that is verified with anoth organization and enforces login through that organizations OIDC provider',
  async () => {
    const seed = initSeed();

    // Create first organization that owns the domain
    const { createOrg } = await seed.createOwner();
    const firstOrg = await createOrg();
    const oidc = await firstOrg.createOIDCIntegration();
    const domain = await oidc.registerFakeDomain();
    await oidc.createMockServerAndUpdateIntegrationEndpoints({
      oidcForVerifiedDomainsRequired: true,
    });

    // Create a second organization that tries to sign up an user with that domain
    const secondOrg = await createOrg();
    const oidcSecondOrg = await secondOrg.createOIDCIntegration();
    const email = 'marty.mcfly@' + domain;
    const oidcAuth = await oidcSecondOrg.createMockServerAndUpdateIntegrationEndpoints();
    oidcAuth.setUser({
      email,
      userIdClaim: email,
    });

    let auth = await oidcAuth.runGetAuthorizationUrl();
    let result = await oidcAuth.runSignInUp({
      state: auth.state,
    });
    invariant(result.type === 'error', 'Expected sign in/up to fail.');

    await oidc.createMockServerAndUpdateIntegrationEndpoints({
      oidcForVerifiedDomainsRequired: false,
    });

    auth = await oidcAuth.runGetAuthorizationUrl();
    result = await oidcAuth.runSignInUp({
      state: auth.state,
    });
    invariant(result.type === 'success', 'Expected sign in/up to succeed.');
  },
);
