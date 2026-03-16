import type { AddressInfo } from 'node:net';
import humanId from 'human-id';
import setCookie from 'set-cookie-parser';
import { sql, type DatabasePool } from 'slonik';
import z from 'zod';
import formDataPlugin from '@fastify/formbody';
import { createServer, type FastifyReply, type FastifyRequest } from '@hive/service-common';
import { graphql } from './gql';
import { execute } from './graphql';
import { getServiceHost, pollForEmailVerificationLink } from './utils';

const apiAddress = await getServiceHost('server', 8082);

async function createMockOIDCServer() {
  const host =
    process.env.RUN_AGAINST_LOCAL_SERVICES === '1' ? 'localhost' : 'host.docker.internal';
  const server = await createServer({
    sentryErrorHandler: false,
    log: {
      requests: false,
      level: 'silent',
    },
    name: '',
  });
  await server.register(formDataPlugin);

  let registeredHandler: typeof handler;

  async function handler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!handler) {
      throw new Error('No handler registered');
    }
    return await registeredHandler(request, reply);
  }

  server.route({
    method: 'POST',
    url: '/token',
    handler,
  });

  server.route({
    method: 'GET',
    url: '/userinfo',
    handler,
  });

  await server.listen({
    port: 0,
    host: '0.0.0.0',
  });

  return {
    url: 'http://' + host + ':' + (server.server.address() as AddressInfo).port,
    setHandler(newHandler: typeof handler) {
      registeredHandler = newHandler;
    },
    [Symbol.asyncDispose]: () => {
      server.close();
    },
  };
}

const CreateOIDCIntegrationMutation = graphql(`
  mutation TestKit_OIDCIntegration_CreateOIDCIntegrationMutation(
    $input: CreateOIDCIntegrationInput!
  ) {
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

const UpdateOIDCIntegrationMutation = graphql(`
  mutation TestKit_OIDCIntegration_UpdateOIDCIntegrationMutation(
    $input: UpdateOIDCIntegrationInput!
  ) {
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

const SendVerificationEmailMutation = graphql(`
  mutation TestKit_OIDCIntegration_SendVerificationEmailMutation(
    $input: SendVerificationEmailInput!
  ) {
    sendVerificationEmail(input: $input) {
      ok {
        expiresAt
      }
      error {
        message
        emailAlreadyVerified
      }
    }
  }
`);

const VerifyEmailMutation = graphql(`
  mutation TestKit_OIDCIntegration_VerifyEmailMutation($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      ok {
        verified
      }
      error {
        message
      }
    }
  }
`);

export async function createOIDCIntegration(args: {
  organizationId: string;
  accessToken: string;
  getPool: () => Promise<DatabasePool>;
}) {
  const { accessToken: authToken, getPool } = args;
  const result = await execute({
    document: CreateOIDCIntegrationMutation,
    variables: {
      input: {
        organizationId: args.organizationId,
        additionalScopes: [],
        authorizationEndpoint: 'http://localhost:6666/noop/authoriation',
        tokenEndpoint: 'http://localhost:6666/noop/token',
        userinfoEndpoint: 'http://localhost:666/noop/userinfo',
        clientId: 'noop',
        clientSecret: 'noop',
      },
    },
    authToken,
  }).then(r => r.expectNoGraphQLErrors());

  if (!result.createOIDCIntegration.ok) {
    throw new Error(result.createOIDCIntegration.error?.message ?? 'Unexpected error.');
  }

  const oidcIntegration = result.createOIDCIntegration.ok.createdOIDCIntegration;

  return {
    oidcIntegration,
    async registerFakeDomain() {
      const randomDomain =
        humanId({
          separator: '',
          capitalize: false,
        }) + '.local';

      const pool = await getPool();
      const query = sql`
        INSERT INTO "oidc_integration_domains" (
          "organization_id"
          , "oidc_integration_id"
          , "domain_name"
          , "verified_at"
        ) VALUES (
          ${args.organizationId}
          , ${oidcIntegration.id}
          , ${randomDomain}
          , NOW()
        )
      `;

      await pool.query(query);
      return randomDomain;
    },
    async createMockServerAndUpdateIntegrationEndpoints(args?: {
      additionalScopes?: Array<string>;
      clientId?: string;
      clientSecret?: string;
    }) {
      const server = await createMockOIDCServer();

      const result = await execute({
        document: UpdateOIDCIntegrationMutation,
        variables: {
          input: {
            oidcIntegrationId: oidcIntegration.id,
            authorizationEndpoint: server.url + '/authorize',
            tokenEndpoint: server.url + '/token',
            userinfoEndpoint: server.url + '/userinfo',
            additionalScopes: args?.additionalScopes,
            clientId: args?.clientId,
            clientSecret: args?.clientSecret,
          },
        },
        authToken,
      }).then(r => r.expectNoGraphQLErrors());

      if (!result.updateOIDCIntegration.ok) {
        throw new Error(result.updateOIDCIntegration.error?.message ?? 'Unexpected error.');
      }

      return {
        setHandler: server.setHandler,
        setUser(args: { email: string; sub: string }) {
          server.setHandler(async (req, res) => {
            if (req.routeOptions.url === '/token') {
              return res.status(200).send({
                access_token: 'yolo',
              });
            }

            if (req.routeOptions.url === '/userinfo') {
              return res.status(200).send({
                sub: args.sub,
                email: args.email,
              });
            }

            console.log('unhandled', req.routeOptions.url);
            return res.status(404).send();
          });
        },
        async runGetAuthorizationUrl() {
          const baseUrl = 'http://' + apiAddress;
          const url = new URL('http://' + apiAddress + '/auth-api/authorisationurl');
          url.searchParams.set('thirdPartyId', 'oidc');
          url.searchParams.set('redirectURIOnProviderDashboard', baseUrl + '/');
          url.searchParams.set('oidc_id', oidcIntegration.id);
          const result = await fetch(url).then(res => res.json());

          const urlWithQueryParams = new URL(result.urlWithQueryParams);
          return {
            codeChallenge: urlWithQueryParams.searchParams.get('code_challenge') ?? '',
            state: urlWithQueryParams.searchParams.get('state') ?? '',
          };
        },
        async runSignInUp(args: { state: string; code?: string }) {
          const url = new URL('http://' + apiAddress + '/auth-api/signinup');
          url.searchParams.set('oidc_id', oidcIntegration.id);

          const result = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
              thirdPartyId: 'oidc',
              redirectURIInfo: {
                redirectURIOnProviderDashboard: '/',
                redirectURIQueryParams: {
                  state: args.state,
                  code: args.code ?? 'noop',
                },
              },
            }),
            headers: {
              'content-type': 'application/json',
              'st-auth-mode': 'cookie',
            },
          });

          if (result.status !== 200) {
            throw new Error('Failed ' + result.status + (await result.text()));
          }

          const rawBody = await result.json();

          const body = z
            .object({
              user: z.object({
                id: z.string(),
                emails: z.array(z.string()),
                loginMethods: z.array(
                  z.object({
                    recipeUserId: z.string(),
                  }),
                ),
              }),
            })
            .parse(rawBody);
          const cookies = setCookie.parse(result.headers.getSetCookie());
          return {
            accessToken: cookies.find(c => c.name === 'sAccessToken')?.value ?? '',
            user: {
              id: body.user.id,
              email: body.user.emails[0],
              userIdentityId: body.user.loginMethods[0]?.recipeUserId,
            },
          };
        },
        async confirmEmail(args: { userIdentityId: string; email: string }) {
          const now = Date.now();
          const sendMail = await execute({
            document: SendVerificationEmailMutation,
            variables: {
              input: {
                userIdentityId: args.userIdentityId,
                resend: true,
              },
            },
            authToken,
          }).then(e => e.expectNoGraphQLErrors());

          if (!sendMail.sendVerificationEmail.ok) {
            throw new Error(sendMail.sendVerificationEmail.error?.message ?? 'Unknown error.');
          }

          const url = await pollForEmailVerificationLink({
            email: args.email,
            now,
          });

          const token = url.searchParams.get('token') ?? '';

          const confirmMail = await execute({
            document: VerifyEmailMutation,
            variables: {
              input: {
                userIdentityId: args.userIdentityId,
                email: args.email,
                token,
              },
            },
            authToken,
          }).then(e => e.expectNoGraphQLErrors());

          if (!confirmMail.verifyEmail.ok) {
            throw new Error(confirmMail.verifyEmail.error?.message ?? 'Unknown error.');
          }
        },
      };
    },
  };
}
