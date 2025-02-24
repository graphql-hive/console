import { APIError, createAuthEndpoint, createEmailVerificationToken } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import {
  createAuthorizationURL,
  generateState,
  parseState,
  validateAuthorizationCode,
  validateToken,
} from 'better-auth/oauth2';
import type { Account, BetterAuthPlugin, GenericEndpointContext, User } from 'better-auth/types';
import { decodeJwt } from 'jose';
import { z } from 'zod';
import { betterFetch, BetterFetchError } from '@better-fetch/fetch';
import type { ServiceLogger } from '@hive/service-common';
import { createRequestLogger } from './logger';

// We can't use the original sso plugin, as the creation of the OIDC provider is linked to a user.
// We need to create the OIDC provider for an organization.
// Adjusting the existing plugin to make it work the way we need it to, would be a lot of work,
// that most likely would be rejected by the maintainers of the plugin.
export const sso = (options: { tableName: string; logger: ServiceLogger }) => {
  const tableName = options.tableName;

  return {
    id: 'sso',
    endpoints: {
      signInSSO: createAuthEndpoint(
        '/sign-in/sso',
        {
          method: 'POST',
          body: z.object({
            providerId: z
              .string({
                description:
                  'The ID of the provider to sign in with. This can be provided instead of email or issuer',
              })
              .optional(),
            domain: z
              .string({
                description: 'The domain of the provider.',
              })
              .optional(),
            callbackURL: z.string({
              description: 'The URL to redirect to after login',
            }),
            errorCallbackURL: z
              .string({
                description: 'The URL to redirect to after login',
              })
              .optional(),
          }),
          metadata: {
            openapi: {
              summary: 'Sign in with SSO provider',
              description:
                "This endpoint is used to sign in with an SSO provider. It redirects to the provider's authorization URL",
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        issuer: {
                          type: 'string',
                          description:
                            "The issuer identifier, this is the URL of the provider and can be used to verify the provider and identify the provider during login. It's optional if the email is provided",
                        },
                        providerId: {
                          type: 'string',
                          description:
                            'The ID of the provider to sign in with. This can be provided instead of email or issuer',
                        },
                        callbackURL: {
                          type: 'string',
                          description: 'The URL to redirect to after login',
                        },
                        errorCallbackURL: {
                          type: 'string',
                          description: 'The URL to redirect to after login',
                        },
                      },
                      required: ['callbackURL'],
                    },
                  },
                },
              },
            },
          },
        },
        async ctx => {
          const body = ctx.body;
          let { providerId } = body;
          if (!providerId) {
            throw new APIError('BAD_REQUEST', {
              message: 'providerId is required',
            });
          }

          const provider = await ctx.context.adapter
            .findOne<SSOProvider>({
              model: tableName,
              where: [
                {
                  field: 'providerId',
                  value: providerId,
                },
              ],
            })
            .then(res => {
              if (!res) {
                return null;
              }
              return {
                ...res,
                oidcConfig: JSON.parse(res.oidcConfig as unknown as string),
              };
            });
          if (!provider) {
            throw new APIError('NOT_FOUND', {
              message: 'No provider found for the issuer',
            });
          }
          const state = await generateState(ctx);
          const redirectURI = `${ctx.context.baseURL}/sso/callback/${provider.providerId}`;
          const authorizationURL = await createAuthorizationURL({
            id: provider.issuer,
            options: {
              clientId: provider.oidcConfig.clientId,
              clientSecret: provider.oidcConfig.clientSecret,
            },
            redirectURI,
            state: state.state,
            codeVerifier: provider.oidcConfig.pkce ? state.codeVerifier : undefined,
            scopes: ['openid', 'email', 'profile', 'offline_access'],
            authorizationEndpoint: provider.oidcConfig.authorizationEndpoint,
          });
          return ctx.json({
            url: authorizationURL.toString(),
            redirect: true,
          });
        },
      ),
      callbackSSO: createAuthEndpoint(
        '/sso/callback/:providerId',
        {
          method: 'GET',
          query: z.object({
            code: z.string().optional(),
            state: z.string(),
            error: z.string().optional(),
            error_description: z.string().optional(),
          }),
          metadata: {
            isAction: false,
            openapi: {
              summary: 'Callback URL for SSO provider',
              description:
                'This endpoint is used as the callback URL for SSO providers. It handles the authorization code and exchanges it for an access token',
              responses: {
                '302': {
                  description: 'Redirects to the callback URL',
                },
              },
            },
          },
        },
        async ctx => {
          const { code, error, error_description } = ctx.query;
          const stateData = await parseState(ctx);
          if (!stateData) {
            throw ctx.redirect(`${ctx.context.baseURL}/error?error=invalid_state`);
          }
          const { callbackURL, errorURL, newUserURL } = stateData;
          if (!code || error) {
            throw ctx.redirect(
              `${errorURL || callbackURL}?error=${error}&error_description=${error_description}`,
            );
          }
          const provider = await ctx.context.adapter
            .findOne<{
              oidcConfig: string;
            }>({
              model: tableName,
              where: [
                {
                  field: 'providerId',
                  value: ctx.params.providerId,
                },
              ],
            })
            .then(res => {
              if (!res) {
                return null;
              }
              return {
                ...res,
                oidcConfig: JSON.parse(res.oidcConfig),
              } as SSOProvider;
            });
          if (!provider) {
            throw ctx.redirect(
              `${
                errorURL || callbackURL
              }/error?error=invalid_provider&error_description=provider not found`,
            );
          }
          let config = provider.oidcConfig;

          const discovery = await betterFetch<{
            token_endpoint: string;
            userinfo_endpoint: string;
            token_endpoint_auth_method: 'client_secret_basic' | 'client_secret_post';
          }>(provider.oidcConfig.discoveryEndpoint);

          if (discovery.data) {
            config = {
              tokenEndpoint: discovery.data.token_endpoint,
              tokenEndpointAuthentication: discovery.data.token_endpoint_auth_method,
              userInfoEndpoint: discovery.data.userinfo_endpoint,
              scopes: ['openid', 'email', 'profile', 'offline_access'],
              ...provider.oidcConfig,
            };
          }

          if (!config.tokenEndpoint) {
            throw ctx.redirect(
              `${
                errorURL || callbackURL
              }/error?error=invalid_provider&error_description=token_endpoint_not_found`,
            );
          }

          const tokenResponse = await validateAuthorizationCode({
            code,
            codeVerifier: provider.oidcConfig.pkce ? stateData.codeVerifier : undefined,
            redirectURI: `${ctx.context.baseURL}/sso/callback/${provider.providerId}`,
            options: {
              clientId: provider.oidcConfig.clientId,
              clientSecret: provider.oidcConfig.clientSecret,
            },
            tokenEndpoint: config.tokenEndpoint,
            authentication:
              config.tokenEndpointAuthentication === 'client_secret_post' ? 'post' : 'basic',
          }).catch(e => {
            if (e instanceof BetterFetchError) {
              throw ctx.redirect(
                `${errorURL || callbackURL}?error=invalid_provider&error_description=${e.message}`,
              );
            }
            return null;
          });
          if (!tokenResponse) {
            throw ctx.redirect(
              `${
                errorURL || callbackURL
              }/error?error=invalid_provider&error_description=token_response_not_found`,
            );
          }
          let userInfo: {
            id?: string;
            email?: string;
            name?: string;
            image?: string;
            emailVerified?: boolean;
            [key: string]: any;
          } | null = null;
          if (tokenResponse.idToken) {
            const idToken = decodeJwt(tokenResponse.idToken);
            if (!config.jwksEndpoint) {
              throw ctx.redirect(
                `${
                  errorURL || callbackURL
                }/error?error=invalid_provider&error_description=jwks_endpoint_not_found`,
              );
            }
            const verified = await validateToken(tokenResponse.idToken, config.jwksEndpoint).catch(
              e => {
                ctx.context.logger.error(e);
                return null;
              },
            );
            if (!verified) {
              throw ctx.redirect(
                `${
                  errorURL || callbackURL
                }/error?error=invalid_provider&error_description=token_not_verified`,
              );
            }
            if (verified.payload.iss !== provider.issuer) {
              throw ctx.redirect(
                `${
                  errorURL || callbackURL
                }/error?error=invalid_provider&error_description=issuer_mismatch`,
              );
            }

            const mapping = config.mapping || {};
            userInfo = {
              ...Object.fromEntries(
                Object.entries(mapping.extraFields || {}).map(([key, value]) => [
                  key,
                  verified.payload[value],
                ]),
              ),
              id: idToken[mapping.id || 'sub'],
              email: idToken[mapping.email || 'email'],
              emailVerified: idToken[mapping.emailVerified || 'email_verified'],
              name: idToken[mapping.name || 'name'],
              image: idToken[mapping.image || 'picture'],
            } as {
              id?: string;
              email?: string;
              name?: string;
              image?: string;
              emailVerified?: boolean;
            };
          }

          if (!userInfo) {
            if (!config.userInfoEndpoint) {
              throw ctx.redirect(
                `${
                  errorURL || callbackURL
                }/error?error=invalid_provider&error_description=user_info_endpoint_not_found`,
              );
            }
            const userInfoResponse = await betterFetch<{
              email?: string;
              name?: string;
              id?: string;
              image?: string;
              emailVerified?: boolean;
            }>(config.userInfoEndpoint, {
              headers: {
                Authorization: `Bearer ${tokenResponse.accessToken}`,
              },
            });
            if (userInfoResponse.error) {
              throw ctx.redirect(
                `${errorURL || callbackURL}/error?error=invalid_provider&error_description=${
                  userInfoResponse.error.message
                }`,
              );
            }
            userInfo = userInfoResponse.data;
          }

          if (!userInfo.email || !userInfo.id) {
            throw ctx.redirect(
              `${
                errorURL || callbackURL
              }/error?error=invalid_provider&error_description=missing_user_info`,
            );
          }

          const linked = await handleOAuthUserInfo(
            createRequestLogger(options.logger, ctx.request?.headers),
            ctx,
            {
              userInfo: {
                email: userInfo.email,
                name: userInfo.name || userInfo.email,
                id: userInfo.id,
                image: userInfo.image,
                emailVerified: userInfo.emailVerified || false,
              },
              account: {
                idToken: tokenResponse.idToken,
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken,
                accountId: userInfo.id,
                providerId: provider.providerId,
                accessTokenExpiresAt: tokenResponse.accessTokenExpiresAt,
                refreshTokenExpiresAt: tokenResponse.refreshTokenExpiresAt,
                scope: tokenResponse.scopes?.join(','),
              },
            },
          );
          if (linked.error) {
            throw ctx.redirect(`${errorURL || callbackURL}/error?error=${linked.error}`);
          }
          const { session, user } = linked.data!;

          // TODO: add member to organization
          //
          // if (provider.organizationId && !options?.organizationProvisioning?.disabled) {
          //   const isOrgPluginEnabled = ctx.context.options.plugins?.find(
          //     plugin => plugin.id === 'organization',
          //   );
          //   if (isOrgPluginEnabled) {
          //     const isAlreadyMember = await ctx.context.adapter.findOne({
          //       model: 'member',
          //       where: [
          //         { field: 'organizationId', value: provider.organizationId },
          //         { field: 'userId', value: user.id },
          //       ],
          //     });
          //     if (!isAlreadyMember) {
          //       const role = options?.organizationProvisioning?.getRole
          //         ? await options.organizationProvisioning.getRole({
          //             user,
          //             userInfo,
          //             token: tokenResponse,
          //             provider,
          //           })
          //         : options?.organizationProvisioning?.defaultRole || 'member';
          //       await ctx.context.adapter.create({
          //         model: 'member',
          //         data: {
          //           organizationId: provider.organizationId,
          //           userId: user.id,
          //           role,
          //           createdAt: new Date(),
          //           updatedAt: new Date(),
          //         },
          //       });
          //     }
          //   }
          // }
          await setSessionCookie(ctx, {
            session,
            user,
          });
          let toRedirectTo: string;
          try {
            const url = linked.isRegister ? newUserURL || callbackURL : callbackURL;
            toRedirectTo = url.toString();
          } catch {
            toRedirectTo = linked.isRegister ? newUserURL || callbackURL : callbackURL;
          }
          throw ctx.redirect(toRedirectTo);
        },
      ),
    },
    schema: {
      auth_sso: {
        fields: {
          issuer: {
            type: 'string',
            required: true,
          },
          oidcConfig: {
            type: 'string',
            required: false,
          },
          samlConfig: {
            type: 'string',
            required: false,
          },
          providerId: {
            type: 'string',
            required: true,
            unique: true,
          },
          organizationId: {
            type: 'string',
            required: true,
          },
          domain: {
            type: 'string',
            required: false,
          },
        },
      },
    },
  } satisfies BetterAuthPlugin;
};

interface SSOProvider {
  issuer: string;
  oidcConfig: OIDCConfig;
  providerId: string;
  organizationId: string;
}

interface OIDCConfig {
  issuer: string;
  pkce: boolean;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint?: string;
  discoveryEndpoint: string;
  userInfoEndpoint?: string;
  scopes?: string[];
  tokenEndpoint?: string;
  tokenEndpointAuthentication?: 'client_secret_post' | 'client_secret_basic';
  jwksEndpoint?: string;
  mapping?: {
    id?: string;
    email?: string;
    emailVerified?: string;
    name?: string;
    image?: string;
    extraFields?: Record<string, string>;
  };
}

async function handleOAuthUserInfo(
  logger: ServiceLogger,
  c: GenericEndpointContext,
  {
    userInfo,
    account,
    callbackURL,
  }: {
    userInfo: Omit<User, 'createdAt' | 'updatedAt'>;
    account: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
    callbackURL?: string;
  },
) {
  const dbUser = await c.context.internalAdapter
    .findOAuthUser(userInfo.email.toLowerCase(), account.accountId, account.providerId)
    .catch(e => {
      logger.error('Better auth was unable to query your database.\nError: ', e);
      throw c.redirect(`${c.context.baseURL}/error?error=internal_server_error`);
    });
  let user = dbUser?.user;
  let isRegister = !user;

  if (dbUser) {
    const hasBeenLinked = dbUser.accounts.find(a => a.providerId === account.providerId);
    if (!hasBeenLinked) {
      const trustedProviders = c.context.options.account?.accountLinking?.trustedProviders;
      const isTrustedProvider = trustedProviders?.includes(account.providerId as 'apple');
      if (
        (!isTrustedProvider && !userInfo.emailVerified) ||
        c.context.options.account?.accountLinking?.enabled === false
      ) {
        logger.warn(
          `User already exist but account isn't linked to ${account.providerId}. To read more about how account linking works in Better Auth see https://www.better-auth.com/docs/concepts/users-accounts#account-linking.`,
        );

        return {
          error: 'account not linked',
          data: null,
        };
      }
      try {
        await c.context.internalAdapter.linkAccount({
          providerId: account.providerId,
          accountId: userInfo.id.toString(),
          userId: dbUser.user.id,
          accessToken: account.accessToken,
          idToken: account.idToken,
          refreshToken: account.refreshToken,
          accessTokenExpiresAt: account.accessTokenExpiresAt,
          refreshTokenExpiresAt: account.refreshTokenExpiresAt,
          scope: account.scope,
        });
      } catch (e) {
        logger.error('Unable to link account', e);
        return {
          error: 'unable to link account',
          data: null,
        };
      }
    } else {
      const updateData = Object.fromEntries(
        Object.entries({
          accessToken: account.accessToken,
          idToken: account.idToken,
          refreshToken: account.refreshToken,
          accessTokenExpiresAt: account.accessTokenExpiresAt,
          refreshTokenExpiresAt: account.refreshTokenExpiresAt,
          scope: account.scope,
        }).filter(([_, value]) => value !== undefined),
      );

      if (Object.keys(updateData).length > 0) {
        await c.context.internalAdapter.updateAccount(hasBeenLinked.id, updateData);
      }
    }
  } else {
    try {
      user = await c.context.internalAdapter
        .createOAuthUser(
          {
            ...userInfo,
            email: userInfo.email.toLowerCase(),
            id: undefined,
          },
          {
            accessToken: account.accessToken,
            idToken: account.idToken,
            refreshToken: account.refreshToken,
            accessTokenExpiresAt: account.accessTokenExpiresAt,
            refreshTokenExpiresAt: account.refreshTokenExpiresAt,
            scope: account.scope,
            providerId: account.providerId,
            accountId: userInfo.id.toString(),
          },
        )
        .then(res => res?.user);
      if (!userInfo.emailVerified && user && c.context.options.emailVerification?.sendOnSignUp) {
        const token = await createEmailVerificationToken(
          c.context.secret,
          user.email,
          undefined,
          c.context.options.emailVerification?.expiresIn,
        );
        const url = `${c.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`;
        await c.context.options.emailVerification?.sendVerificationEmail?.(
          {
            user,
            url,
            token,
          },
          c.request,
        );
      }
    } catch (e: any) {
      logger.error(e);
      if (e instanceof APIError) {
        return {
          error: e.message,
          data: null,
          isRegister: false,
        };
      }
      return {
        error: 'unable to create user',
        data: null,
        isRegister: false,
      };
    }
  }
  if (!user) {
    return {
      error: 'unable to create user',
      data: null,
      isRegister: false,
    };
  }

  const session = await c.context.internalAdapter.createSession(user.id, c.request);
  if (!session) {
    return {
      error: 'unable to create session',
      data: null,
      isRegister: false,
    };
  }
  return {
    data: {
      session,
      user,
    },
    error: null,
    isRegister,
  };
}
