import type { FastifyBaseLogger } from 'fastify';
import type { FastifyRequest } from 'supertokens-node/lib/build/framework/fastify/framework';
import type { ProviderInput } from 'supertokens-node/recipe/thirdparty/types';
import type { TypeInput as ThirdPartEmailPasswordTypeInput } from 'supertokens-node/recipe/thirdpartyemailpassword/types';
import zod from 'zod';
import { createInternalApiCaller } from '../api';

const couldNotResolveOidcIntegrationSymbol = Symbol('could_not_resolve_oidc_integration');

type InternalApiCaller = ReturnType<typeof createInternalApiCaller>;

export const getOIDCSuperTokensOverrides = (): ThirdPartEmailPasswordTypeInput['override'] => ({
  apis(originalImplementation) {
    return {
      ...originalImplementation,
      async authorisationUrlGET(input) {
        if (input.userContext?.[couldNotResolveOidcIntegrationSymbol] === true) {
          return {
            status: 'GENERAL_ERROR',
            message: 'Could not find OIDC integration.',
          };
        }

        return originalImplementation.authorisationUrlGET!(input);
      },
    };
  },
});

export type BroadcastOIDCIntegrationLog = (oidcId: string, message: string) => void;

export function getLoggerFromUserContext(userContext: unknown): FastifyBaseLogger {
  return (userContext as any)._default.request.request.log;
}

export const createOIDCSuperTokensProvider = (args: {
  internalApi: InternalApiCaller;
  broadcastLog: BroadcastOIDCIntegrationLog;
}): ProviderInput => ({
  config: {
    thirdPartyId: 'oidc',
  },
  override(originalImplementation) {
    return {
      ...originalImplementation,
      async getConfigForClientType(input) {
        const logger = getLoggerFromUserContext(input.userContext);
        logger.info('resolve config for OIDC provider.');
        const config = await getOIDCConfigFromInput(args.internalApi, logger, input);
        if (!config) {
          // In the next step the override `authorisationUrlGET` from `getOIDCSuperTokensOverrides` is called.
          // We use the user context to return a `GENERAL_ERROR` with a human readable message.
          // We cannot return an error here (except an "Unexpected error"), so we also need to return fake dat
          input.userContext[couldNotResolveOidcIntegrationSymbol] = true;

          return {
            thirdPartyId: 'oidc',
            get clientId(): string {
              throw new Error('Noop value accessed.');
            },
          };
        }

        return {
          thirdPartyId: 'oidc',
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authorizationEndpoint: config.authorizationEndpoint,
          userInfoEndpoint: config.userinfoEndpoint,
          tokenEndpoint: config.tokenEndpoint,
          scope: ['openid', 'email', ...config.additionalScopes],
        };
      },

      async getAuthorisationRedirectURL(input) {
        const logger = getLoggerFromUserContext(input.userContext);
        logger.info('resolve authorization redirect url of OIDC provider.');
        const oidcConfig = await getOIDCConfigFromInput(args.internalApi, logger, input);

        if (!oidcConfig) {
          // This case should never be reached (guarded by getConfigForClientType).
          // We still have it for security reasons.
          throw new Error('Could not find OIDC integration.');
        }

        const authorizationRedirectUrl =
          await originalImplementation.getAuthorisationRedirectURL(input);

        const url = new URL(authorizationRedirectUrl.urlWithQueryParams);
        url.searchParams.set('state', oidcConfig.id);

        const urlWithQueryParams = url.toString();

        args.broadcastLog(oidcConfig.id, `redirect client to oauth provider ${urlWithQueryParams}`);

        return {
          ...authorizationRedirectUrl,
          urlWithQueryParams,
        };
      },

      async exchangeAuthCodeForOAuthTokens(input) {
        const logger = getLoggerFromUserContext(input.userContext);
        const config = await getOIDCConfigFromInput(args.internalApi, logger, input);
        if (!config) {
          // This case should never be reached (guarded by getConfigForClientType).
          // We still have it for security reasons.
          throw new Error('Could not find OIDC integration.');
        }

        logger.info('exchange auth code for oauth token (oidcId=%s)', config.id);

        args.broadcastLog(
          config.id,
          `attempt exchanging auth code for auth tokens on endpoint ${config.tokenEndpoint}`,
        );

        try {
          // TODO: we should probably have our own custom implementation of this that uses fetch API.
          // that way we can also do timeouts, retries and more detailed logging.
          const result = await originalImplementation.exchangeAuthCodeForOAuthTokens(input);
          args.broadcastLog(
            config.id,
            `successfully exchanged auth code for tokens on endpoint ${config.tokenEndpoint}`,
          );
          return result;
        } catch (error) {
          if (error instanceof Error) {
            args.broadcastLog(
              config.id,
              `error while exchanging auth code for tokens on endpoint ${config.tokenEndpoint}: ${error.message}`,
            );
          }
          throw error;
        }
      },

      async getUserInfo(input) {
        const logger = getLoggerFromUserContext(input.userContext);
        logger.info('retrieve profile info from OIDC provider');
        const config = await getOIDCConfigFromInput(args.internalApi, logger, input);
        if (!config) {
          // This case should never be reached (guarded by getConfigForClientType).
          // We still have it for security reasons.
          throw new Error('Could not find OIDC integration.');
        }

        logger.info('fetch info for OIDC provider (oidcId=%s)', config.id);

        args.broadcastLog(
          config.id,
          `attempt fetching user info from endpoint with timeout 10 seconds ${config.userinfoEndpoint}`,
        );

        const abortController = new AbortController();

        const timeout = setTimeout(() => {
          abortController.abort();
          args.broadcastLog(
            config.id,
            `failed fetching user info from endpoint ${config.userinfoEndpoint}. Request timed out.`,
          );
        }, 10_000);

        const tokenResponse = OIDCTokenSchema.parse(input.oAuthTokens);
        const response = await fetch(config.userinfoEndpoint, {
          headers: {
            authorization: `Bearer ${tokenResponse.access_token}`,
            accept: 'application/json',
            'content-type': 'application/json',
          },
          signal: abortController.signal,
        });

        if (response.status !== 200) {
          clearTimeout(timeout);
          logger.info('received invalid status code (oidcId=%s)', config.id);
          args.broadcastLog(
            config.id,
            `failed fetching user info from endpoint "${config.userinfoEndpoint}". Received status code ${response.status}. Expected 200.`,
          );
          throw new Error("Received invalid status code. Could not retrieve user's profile info.");
        }

        const body = await response.text();
        clearTimeout(timeout);

        let rawData: unknown;

        try {
          rawData = JSON.parse(body);
        } catch (err) {
          logger.error('Could not parse JSON response from OIDC provider (oidcId=%s)', config.id);
          if (err instanceof Error) {
            args.broadcastLog(
              config.id,
              `failed parsing user info request body for response from user info endpoint "${config.userinfoEndpoint}". Error: ${err.message}.`,
            );
          }
          throw new Error('Could not parse JSON response.');
        }

        logger.info('retrieved profile info for provider (oidcId=%s)', config.id);

        const dataParseResult = OIDCProfileInfoSchema.safeParse(rawData);

        if (!dataParseResult.success) {
          logger.error('Could not parse profile info for OIDC provider (oidcId=%s)', config.id);
          logger.error('Raw data: %s', JSON.stringify(rawData));
          logger.error('Error: %s', JSON.stringify(dataParseResult.error));
          for (const issue of dataParseResult.error.issues) {
            logger.debug('Issue: %s', JSON.stringify(issue));
          }
          args.broadcastLog(
            config.id,
            `failed validating user info request body for response from user info endpoint "${config.userinfoEndpoint}". Issues: ${JSON.stringify(dataParseResult.error.issues)}`,
          );

          throw new Error('Could not parse profile info.');
        }

        args.broadcastLog(
          config.id,
          `successfully parsed user info request body for response from user info endpoint "${config.userinfoEndpoint}".`,
        );

        const profile = dataParseResult.data;

        // Set the oidcId to the user context so it can be used in `thirdPartySignInUpPOST` for linking the user account to the OIDC integration.
        input.userContext.oidcId = config.id;

        return {
          thirdPartyUserId: `${config.id}-${profile.sub}`,
          email: {
            id: profile.email,
            isVerified: true,
          },
          rawUserInfoFromProvider: {
            fromIdTokenPayload: undefined,
            fromUserInfoAPI: undefined,
          },
        };
      },
    };
  },
});

type OIDCConfig = {
  id: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  authorizationEndpoint: string;
  additionalScopes: string[];
};

const OIDCProfileInfoSchema = zod.object({
  sub: zod.string(),
  email: zod.string().email(),
});

const OIDCTokenSchema = zod.object({ access_token: zod.string() });

const getOIDCIdFromInput = (input: { userContext: any }, logger: FastifyBaseLogger): string => {
  const fastifyRequest = input.userContext._default.request as FastifyRequest;
  const originalUrl = 'http://localhost' + fastifyRequest.getOriginalURL();
  const oidcId = new URL(originalUrl).searchParams.get('oidc_id');

  if (typeof oidcId !== 'string') {
    logger.error('Invalid OIDC ID sent from client: %s', oidcId);
    throw new Error('Invalid OIDC ID sent from client.');
  }

  return oidcId;
};

const configCache = new WeakMap<FastifyRequest, OIDCConfig | null>();

/**
 * Get cached OIDC config from the supertokens input.
 */
async function getOIDCConfigFromInput(
  internalApi: InternalApiCaller,
  logger: FastifyBaseLogger,
  input: { userContext: any },
) {
  const fastifyRequest = input.userContext._default.request as FastifyRequest;
  if (configCache.has(fastifyRequest)) {
    return configCache.get(fastifyRequest) ?? null;
  }

  const oidcIntegrationId = getOIDCIdFromInput(input, logger);
  const config = await fetchOIDCConfig(internalApi, logger, oidcIntegrationId);
  if (!config) {
    configCache.set(fastifyRequest, null);
    logger.error('Could not find OIDC integration (oidcId: %s)', oidcIntegrationId);
    return null;
  }
  const resolvedConfig = { oidcIntegrationId, ...config };
  configCache.set(fastifyRequest, resolvedConfig);

  return resolvedConfig;
}

/**
 * Classify an OIDC sign-in error into a user-safe description.
 * Avoids leaking sensitive details (app IDs, trace IDs, internal URLs)
 * while still pointing administrators toward the likely cause.
 */
export function describeOIDCSignInError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('invalid_client')) {
    return 'Authentication with your OIDC provider failed due to invalid client credentials. This commonly happens when the client secret has expired or the client ID is incorrect. Please review your OIDC integration settings.';
  }

  if (message.includes('invalid_grant')) {
    return 'The authorization could not be completed. This can happen if the authorization code has expired. Please try signing in again.';
  }

  if (message.includes('unauthorized_client')) {
    return 'Your OIDC provider rejected the client authorization. Please verify your OIDC integration configuration.';
  }

  if (message.includes('invalid_request')) {
    return 'Your OIDC provider rejected the token request as malformed. This may indicate a misconfigured token endpoint URL. Please review your OIDC integration settings.';
  }

  if (message.includes('unsupported_grant_type')) {
    return 'Your OIDC provider does not support the authorization code grant type. Please verify the provider supports the OAuth 2.0 authorization code flow.';
  }

  if (message.includes('invalid_scope')) {
    return 'Your OIDC provider rejected the requested scopes. Please review the additional scopes configured in your OIDC integration settings.';
  }

  if (message.includes('Could not find OIDC integration')) {
    return 'The OIDC integration could not be found. It may have been removed or misconfigured. Please contact your organization administrator.';
  }

  if (message.includes("Could not retrieve user's profile info")) {
    return "Your OIDC provider's user info endpoint returned an error. Please verify the user info endpoint URL in your OIDC integration settings is correct.";
  }

  if (message.includes('Could not parse JSON response')) {
    return "Your OIDC provider's user info endpoint returned an invalid response. Please verify the user info endpoint URL in your OIDC integration settings is correct.";
  }

  if (message.includes('Could not parse profile info')) {
    return "Your OIDC provider's user info endpoint did not return the required fields (sub, email). Please verify your OIDC provider is configured to include these claims.";
  }

  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ETIMEDOUT') ||
    message.includes('fetch failed')
  ) {
    return 'Could not connect to your OIDC provider. Please verify the endpoint URLs in your OIDC integration settings are correct and the server is accessible.';
  }

  return 'An unexpected error occurred while authenticating with your OIDC provider. Please verify your OIDC integration configuration or contact your administrator.';
}

const fetchOIDCConfig = async (
  internalApi: InternalApiCaller,
  logger: FastifyBaseLogger,
  oidcIntegrationId: string,
): Promise<OIDCConfig | null> => {
  const result = await internalApi.getOIDCIntegrationById({ oidcIntegrationId });
  if (result === null) {
    logger.error('OIDC integration not found. (oidcId=%s)', oidcIntegrationId);
    return null;
  }
  return result;
};
