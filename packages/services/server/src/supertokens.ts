import type { FastifyBaseLogger } from 'fastify';
import type Redis from 'ioredis';
import { CryptoProvider } from 'packages/services/api/src/modules/shared/providers/crypto';
import { OverrideableBuilder } from 'supertokens-js-override/lib/build/index.js';
import supertokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session/index.js';
import type { ProviderInput } from 'supertokens-node/recipe/thirdparty/types';
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword/index.js';
import type { TypeInput as ThirdPartEmailPasswordTypeInput } from 'supertokens-node/recipe/thirdpartyemailpassword/types';
import type { TypeInput } from 'supertokens-node/types';
import zod from 'zod';
import { type Storage } from '@hive/api';
import { TaskScheduler } from '@hive/workflows/kit';
import { PasswordResetTask } from '@hive/workflows/tasks/password-reset';
import { createInternalApiCaller } from './api';
import { env } from './environment';
import {
  createOIDCSuperTokensProvider,
  getLoggerFromUserContext,
  getOIDCSuperTokensOverrides,
  type BroadcastOIDCIntegrationLog,
} from './supertokens/oidc-provider';
import { createThirdPartyEmailPasswordNodeOktaProvider } from './supertokens/okta-provider';

const SuperTokenAccessTokenV2Model = zod.object({
  version: zod.literal('2'),
  superTokensUserId: zod.string(),
  userId: zod.string(),
  oidcIntegrationId: zod.string().nullable(),
  email: zod.string(),
});

export type SupertokensSession = zod.TypeOf<typeof SuperTokenAccessTokenV2Model>;

export const backendConfig = (requirements: {
  storage: Storage;
  crypto: CryptoProvider;
  logger: FastifyBaseLogger;
  broadcastLog: BroadcastOIDCIntegrationLog;
  redis: Redis;
  taskScheduler: TaskScheduler;
}): TypeInput => {
  const { logger } = requirements;

  const internalApi = createInternalApiCaller({
    storage: requirements.storage,
    crypto: requirements.crypto,
  });
  const providers: ProviderInput[] = [];

  if (env.auth.github) {
    providers.push({
      config: {
        thirdPartyId: 'github',
        clients: [
          {
            scope: ['read:user', 'user:email'],
            clientId: env.auth.github.clientId,
            clientSecret: env.auth.github.clientSecret,
          },
        ],
      },
    });
  }
  if (env.auth.google) {
    providers.push({
      config: {
        thirdPartyId: 'google',
        clients: [
          {
            clientId: env.auth.google.clientId,
            clientSecret: env.auth.google.clientSecret,
            scope: [
              'https://www.googleapis.com/auth/userinfo.email',
              'https://www.googleapis.com/auth/userinfo.profile',
              'openid',
            ],
          },
        ],
      },
    });
  }

  if (env.auth.okta) {
    providers.push(createThirdPartyEmailPasswordNodeOktaProvider(env.auth.okta));
  }

  if (env.auth.organizationOIDC) {
    providers.push(
      createOIDCSuperTokensProvider({
        internalApi,
        broadcastLog: requirements.broadcastLog,
      }),
    );
  }

  logger.info('SuperTokens providers: %s', providers.map(p => p.config.thirdPartyId).join(', '));
  logger.info('SuperTokens websiteDomain: %s', env.hiveServices.webApp.url);
  logger.info('SuperTokens apiDomain: %s', env.graphql.origin);

  return {
    framework: 'fastify',
    supertokens: {
      connectionURI: env.supertokens.connectionURI,
      apiKey: env.supertokens.apiKey,
    },
    telemetry: false,
    appInfo: {
      // learn more about this on https://supertokens.com/docs/thirdpartyemailpassword/appinfo
      appName: 'GraphQL Hive',
      apiDomain: env.graphql.origin,
      websiteDomain: env.hiveServices.webApp.url,
      apiBasePath: '/auth-api',
      websiteBasePath: '/auth',
    },
    recipeList: [
      ThirdPartyEmailPasswordNode.init({
        providers,
        signUpFeature: {
          formFields: [
            {
              id: 'firstName',
              // optional because of OIDC integration
              optional: true,
            },
            {
              id: 'lastName',
              optional: true,
            },
          ],
        },
        emailDelivery: {
          override: originalImplementation => ({
            ...originalImplementation,
            async sendEmail(input) {
              if (input.type === 'PASSWORD_RESET') {
                await requirements.taskScheduler.scheduleTask(PasswordResetTask, {
                  user: {
                    id: input.user.id,
                    email: input.user.email,
                  },
                  passwordResetLink: input.passwordResetLink,
                });

                return Promise.resolve();
              }

              return Promise.reject(new Error('Unsupported email type.'));
            },
          }),
        },
        override: composeSuperTokensOverrides([
          getEnsureUserOverrides(internalApi, requirements.redis),
          env.auth.organizationOIDC ? getOIDCSuperTokensOverrides() : null,
        ]),
      }),
      SessionNode.init({
        override: {
          functions: originalImplementation => ({
            ...originalImplementation,
            async createNewSession(input) {
              console.log(`Creating a new session for "${input.userId}"`);
              const user = await supertokens.getUser(input.userId, input.userContext);

              if (!user) {
                console.log(`Failed to find user with id "${input.userId}"`);
                throw new Error(
                  `SuperTokens: Creating a new session failed. Could not find user with id ${input.userId}.`,
                );
              }

              const internalUser = await internalApi.ensureUser({
                superTokensUserId: user.id,
                email: user.emails[0],
                oidcIntegrationId: input.userContext['oidcId'] ?? null,
                firstName: null,
                lastName: null,
              });
              const payload: SupertokensSession = {
                version: '2',
                superTokensUserId: input.userId,
                userId: internalUser.user.id,
                oidcIntegrationId: input.userContext['oidcId'] ?? null,
                email: user.emails[0],
              };

              input.accessTokenPayload = structuredClone(payload);
              input.sessionDataInDatabase = structuredClone(payload);

              return originalImplementation.createNewSession(input);
            },
          }),
        },
      }),
    ],
    isInServerlessEnv: true,
  };
};

function extractIPFromUserContext(userContext: unknown): string {
  const defaultIp = (userContext as any)._default.request.original.ip;
  if (!env.supertokens?.rateLimit) {
    return defaultIp;
  }

  return (
    (userContext as any)._default.request.getHeaderValue(env.supertokens.rateLimit.ipHeaderName) ??
    defaultIp
  );
}

function createRedisRateLimiter(redis: Redis, windowSeconds = 5 * 60, maxRequests = 10) {
  async function isRateLimited(action: string, ip: string): Promise<boolean> {
    if (env.supertokens.rateLimit === null) {
      return false;
    }

    const key = `supertokens-rate-limit:${action}:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    if (current > maxRequests) {
      return true;
    }

    return false;
  }

  return { isRateLimited };
}

const getEnsureUserOverrides = (
  internalApi: ReturnType<typeof createInternalApiCaller>,
  redis: Redis,
): ThirdPartEmailPasswordTypeInput['override'] => ({
  apis: originalImplementation => ({
    ...originalImplementation,
    emailPasswordSignUpPOST: async input => {
      if (!originalImplementation.emailPasswordSignUpPOST) {
        throw Error('emailPasswordSignUpPOST is not available');
      }

      const logger = getLoggerFromUserContext(input.userContext);
      const ip = extractIPFromUserContext(input.userContext);
      const rateLimiter = createRedisRateLimiter(redis);

      if (await rateLimiter.isRateLimited('sign-up', ip)) {
        logger.debug('email password sign up rate limited (ip=%s)', ip);
        return {
          status: 'GENERAL_ERROR',
          message: 'Please try again in a few minutes.',
        };
      }

      const response = await originalImplementation.emailPasswordSignUpPOST(input);

      const firstName = input.formFields.find(field => field.id === 'firstName')?.value ?? null;
      const lastName = input.formFields.find(field => field.id === 'lastName')?.value ?? null;

      if (response.status === 'OK') {
        await internalApi.ensureUser({
          superTokensUserId: response.user.id,
          email: response.user.emails[0],
          oidcIntegrationId: null,
          firstName,
          lastName,
        });
      }

      return response;
    },
    async emailPasswordSignInPOST(input) {
      if (originalImplementation.emailPasswordSignInPOST === undefined) {
        throw Error('Should never come here');
      }

      const logger = getLoggerFromUserContext(input.userContext);
      const ip = extractIPFromUserContext(input.userContext);
      const rateLimiter = createRedisRateLimiter(redis);

      if (await rateLimiter.isRateLimited('sign-in', ip)) {
        logger.debug('email sign in rate limited (ip=%s)', ip);
        return {
          status: 'GENERAL_ERROR',
          message: 'Please try again in a few minutes.',
        };
      }

      const response = await originalImplementation.emailPasswordSignInPOST(input);

      if (response.status === 'OK') {
        await internalApi.ensureUser({
          superTokensUserId: response.user.id,
          email: response.user.emails[0],
          oidcIntegrationId: null,
          // They are not available during sign in.
          firstName: null,
          lastName: null,
        });
      }

      return response;
    },
    async thirdPartySignInUpPOST(input) {
      if (originalImplementation.thirdPartySignInUpPOST === undefined) {
        throw Error('Should never come here');
      }

      function extractOidcId(args: typeof input) {
        if (input.provider.id === 'oidc') {
          const oidcId: unknown = args.userContext['oidcId'];
          if (typeof oidcId === 'string') {
            return oidcId;
          }
        }
        return null;
      }
      const response = await originalImplementation.thirdPartySignInUpPOST(input);

      if (response.status === 'OK') {
        await internalApi.ensureUser({
          superTokensUserId: response.user.id,
          email: response.user.emails[0],
          oidcIntegrationId: extractOidcId(input),
          // TODO: should we somehow extract the first and last name from the third party provider?
          firstName: null,
          lastName: null,
        });
      }

      return response;
    },
    async passwordResetPOST(input) {
      const logger = getLoggerFromUserContext(input.userContext);
      const ip = extractIPFromUserContext(input.userContext);
      const rateLimiter = createRedisRateLimiter(redis);

      if (await rateLimiter.isRateLimited('password-reset', ip)) {
        logger.debug('password reset rate limited (ip=%s)', ip);
        return {
          status: 'GENERAL_ERROR',
          message: 'Please try again in a few minutes.',
        };
      }

      const result = await originalImplementation.passwordResetPOST!(input);

      // For security reasons we revoke all sessions when a password reset is performed.
      if (result.status === 'OK' && result.user) {
        await SessionNode.revokeAllSessionsForUser(result.user.id);
      }

      return result;
    },
  }),
});

const bindObjectFunctions = <T extends { [key: string]: CallableFunction | undefined }>(
  obj: T,
  bindTo: any,
) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value?.bind(bindTo)]),
  ) as T;
};

/**
 * Utility function for composing multiple (dynamic SuperTokens overrides).
 */
const composeSuperTokensOverrides = (
  overrides: Array<ThirdPartEmailPasswordTypeInput['override'] | null>,
) => ({
  apis(
    originalImplementation: ReturnType<
      Exclude<Exclude<ThirdPartEmailPasswordTypeInput['override'], undefined>['apis'], undefined>
    >,
    builder: OverrideableBuilder<ThirdPartyEmailPasswordNode.APIInterface> | undefined,
  ) {
    let impl = originalImplementation;
    for (const override of overrides) {
      if (typeof override?.apis === 'function') {
        impl = bindObjectFunctions(override.apis(impl, builder), originalImplementation);
      }
    }
    return impl;
  },
  functions(
    originalImplementation: ReturnType<
      Exclude<
        Exclude<ThirdPartEmailPasswordTypeInput['override'], undefined>['functions'],
        undefined
      >
    >,
  ) {
    let impl = originalImplementation;
    for (const override of overrides) {
      if (typeof override?.functions === 'function') {
        impl = bindObjectFunctions(override.functions(impl), originalImplementation);
      }
    }
    return impl;
  },
});

export function initSupertokens(requirements: {
  storage: Storage;
  crypto: CryptoProvider;
  logger: FastifyBaseLogger;
  broadcastLog: BroadcastOIDCIntegrationLog;
  redis: Redis;
  taskScheduler: TaskScheduler;
}) {
  supertokens.init(backendConfig(requirements));
}

type OidcIdLookupResponse =
  | {
      ok: true;
      id: string;
    }
  | {
      ok: false;
      title: string;
      description: string;
      status: number;
    };

export async function oidcIdLookup(
  slug: string,
  storage: Storage,
  logger: FastifyBaseLogger,
): Promise<OidcIdLookupResponse> {
  logger.debug('Looking up OIDC integration ID for organization %s', slug);
  const oidcId = await storage.getOIDCIntegrationIdForOrganizationSlug({ slug });

  if (!oidcId) {
    return {
      ok: false,
      title: 'SSO integration not found',
      description: 'Your organization lacks an SSO integration or it does not exist.',
      status: 404,
    };
  }

  return {
    ok: true,
    id: oidcId,
  };
}
