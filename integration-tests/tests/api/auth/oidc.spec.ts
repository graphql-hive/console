import { graphql } from 'testkit/gql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';

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
    const { createOrg } = await seed.createOwner();
    const { createOIDCIntegration } = await createOrg();

    const { createMockServerAndUpdateIntegrationEndpoints } = await createOIDCIntegration();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints();

    const auth = await oidc.runGetAuthorizationUrl();

    oidc.setHandler(async (req, res) => {
      if (req.routeOptions.url === '/token') {
        return res.status(200).send({
          access_token: 'yolo',
        });
      }

      if (req.routeOptions.url === '/userinfo') {
        return res.status(200).send({
          sub: 'test-user',
          email: 'foo@foo.de',
        });
      }

      console.log('unhandled', req.routeOptions.url);
      return res.status(404).send();
    });

    const result = await oidc.runSignInUp({
      state: auth.state,
    });

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
        email: 'foo@foo.de',
        id: expect.any(String),
      },
    });
  },
);

test.concurrent(
  'If the OIDC provider users email changes, the users email is updated upon login',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createOIDCIntegration } = await createOrg();

    const { createMockServerAndUpdateIntegrationEndpoints } = await createOIDCIntegration();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints();

    let auth = await oidc.runGetAuthorizationUrl();

    oidc.setHandler(async (req, res) => {
      if (req.routeOptions.url === '/token') {
        return res.status(200).send({
          access_token: 'yolo',
        });
      }

      if (req.routeOptions.url === '/userinfo') {
        return res.status(200).send({
          sub: 'test-user',
          email: 'foo@foo.de',
        });
      }

      console.log('unhandled', req.routeOptions.url);
      return res.status(404).send();
    });

    let result = await oidc.runSignInUp({
      state: auth.state,
    });

    await oidc.confirmEmail(result.user);

    let meResult = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(meResult).toMatchObject({
      me: {
        email: 'foo@foo.de',
        id: expect.any(String),
      },
    });

    auth = await oidc.runGetAuthorizationUrl();

    oidc.setHandler(async (req, res) => {
      if (req.routeOptions.url === '/token') {
        return res.status(200).send({
          access_token: 'yolo',
        });
      }

      if (req.routeOptions.url === '/userinfo') {
        return res.status(200).send({
          sub: 'test-user',
          email: 'oof@foo.de',
        });
      }

      console.log('unhandled', req.routeOptions.url);
      return res.status(404).send();
    });

    result = await oidc.runSignInUp({
      state: auth.state,
    });
    await oidc.confirmEmail(result.user);
    meResult = await execute({
      document: TestMeQuery,
      authToken: result.accessToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(meResult).toMatchObject({
      me: {
        email: 'oof@foo.de',
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

    const { createMockServerAndUpdateIntegrationEndpoints, registerFakeDomain: registerDomain } =
      await createOIDCIntegration();
    const domain = await registerDomain();
    const oidc = await createMockServerAndUpdateIntegrationEndpoints();

    const email = 'foo@' + domain;

    let auth = await oidc.runGetAuthorizationUrl();

    oidc.setHandler(async (req, res) => {
      if (req.routeOptions.url === '/token') {
        return res.status(200).send({
          access_token: 'yolo',
        });
      }

      if (req.routeOptions.url === '/userinfo') {
        return res.status(200).send({
          sub: 'test-user',
          email,
        });
      }

      console.log('unhandled', req.routeOptions.url);
      return res.status(404).send();
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
