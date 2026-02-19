import { FastifyReply, type FastifyInstance } from 'fastify';
import * as oidClient from 'openid-client';
import z from 'zod';
import cookie from '@fastify/cookie';
import { CryptoProvider, Storage, User } from '@hive/api';
import {
  AccessTokenKeyContainer,
  comparePassword,
  createAccessToken,
  createFrontToken,
  createRefreshToken,
  getPasswordResetHash,
  hashPassword,
  parseRefreshToken,
  sha256,
} from '@hive/api/modules/auth/lib/supertokens-at-home/crypto';
import { OAuthCache } from '@hive/api/modules/auth/providers/oauth-cache';
import {
  EmailPasswordOrThirdPartyUser,
  SuperTokensStore,
} from '@hive/api/modules/auth/providers/supertokens-store';
import { RedisRateLimiter } from '@hive/api/modules/shared/providers/redis-rate-limiter';
import { TaskScheduler } from '@hive/workflows/kit';
import { PasswordResetTask } from '@hive/workflows/tasks/password-reset';
import { env } from './environment';
import { createNewSession, validatePassword } from './supertokens-at-home/shared';
import { type BroadcastOIDCIntegrationLog } from './supertokens/oidc-provider';

/**
 * Registers the routes of the Supertokens at Home implementation to a fastify instance.
 */
export async function registerSupertokensAtHome(
  server: FastifyInstance,
  storage: Storage,
  taskScheduler: TaskScheduler,
  crypto: CryptoProvider,
  rateLimiter: RedisRateLimiter,
  oauthCache: OAuthCache,
  broadcastLog: BroadcastOIDCIntegrationLog,
  secrets: {
    refreshTokenKey: string;
    accessTokenKey: string;
  },
) {
  const supertokensStore = new SuperTokensStore(storage.pool, server.log);

  const accessTokenKey = new AccessTokenKeyContainer(secrets.accessTokenKey);

  await server.register(cookie, {
    hook: 'onRequest',
    parseOptions: {},
  });

  function unsetAuthCookies(reply: FastifyReply) {
    return reply
      .setCookie('sRefreshToken', '', {
        httpOnly: true,
        secure: true,
        path: '/auth-api/session/refresh',
        sameSite: 'lax',
        expires: new Date(0),
      })
      .setCookie('sAccessToken', '', {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'lax',
        expires: new Date(0),
      });
  }

  server.route({
    url: '/auth-api/signout',
    method: 'POST',
    handler(_, rep) {
      return unsetAuthCookies(rep)
        .header('front-token', 'remove')
        .header('Access-Control-Expose-Headers', 'front-token')
        .send({
          status: 'OK',
        });
    },
  });

  server.route({
    url: '/auth-api/signup',
    method: 'POST',
    async handler(req, rep) {
      if (await rateLimiter.isFastifyRouteRateLimited(req)) {
        return rep.send({
          status: 'GENERAL_ERROR',
          message: 'Please try again later.',
        });
      }

      const parsedBody = SignUpBodyModel.safeParse(req.body);

      if (!parsedBody.success) {
        return rep.send(401);
      }

      const firstName =
        parsedBody.data.formFields.find(field => field.id === 'firstName')?.value ?? null;
      const lastName =
        parsedBody.data.formFields.find(field => field.id === 'lastName')?.value ?? null;
      const email = parsedBody.data.formFields.find(field => field.id === 'email')?.value ?? '';
      const password =
        parsedBody.data.formFields.find(field => field.id === 'password')?.value ?? '';

      const emailRegex = /^((?!\.)[\w-_.]*[^.])(@\w+)(\.\w+(\.\w+)?[^.\W])$/gim;

      // Verify email
      if (!emailRegex.test(email)) {
        return rep.send({
          status: 'GENERAL_ERROR',
          message: 'Invalid email provided.',
        });
      }

      // Lookup user
      let user = await supertokensStore.lookupEmailUserByEmail(email);

      if (user) {
        return rep.send({
          status: 'FIELD_ERROR',
          formFields: [
            {
              id: 'email',
              error: 'This email already exists. Please sign in instead.',
            },
          ],
        });
      }

      const passwordValidation = validatePassword(password);

      if (passwordValidation.status === 'INVALID') {
        return rep.send({
          status: 'FIELD_ERROR',
          formFields: [
            {
              id: 'password',
              error: passwordValidation.message,
            },
          ],
        });
      }

      // hash password
      const passwordHash = await hashPassword(password);

      // create user
      user = await supertokensStore.createEmailPasswordUser({
        email,
        passwordHash,
      });

      const ensureUserResult = await storage.ensureUserExists({
        superTokensUserId: user.userId,
        email,
        oidcIntegration: null,
        firstName,
        lastName,
      });

      if (ensureUserResult.ok === false) {
        return rep.send({
          status: 'SIGN_UP_NOT_ALLOWED',
          reason: 'Not allowed.',
        });
      }

      const { session, accessToken, refreshToken } = await createNewSession(
        supertokensStore,
        {
          hiveUser: ensureUserResult.user,
          oidcIntegrationId: null,
          superTokensUserId: user.userId,
        },
        {
          refreshTokenKey: secrets.refreshTokenKey,
          accessTokenKey,
        },
      );
      const frontToken = createFrontToken({
        superTokensUserId: user.userId,
        accessToken,
      });

      return rep
        .setCookie('sRefreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .setCookie('sAccessToken', accessToken.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .header('front-token', frontToken)
        .header('access-control-expose-headers', 'front-token')
        .send({
          status: 'OK',
          user: {
            id: user.userId,
            isPrimaryUser: false,
            tenantIds: ['public'],
            timeJoined: user.timeJoined,
            emails: [user.email],
            phoneNumbers: [],
            thirdParty: [],
            loginMethods: [
              {
                tenantIds: ['public'],
                recipeUserId: user.userId,
                verified: false,
                timeJoined: user.timeJoined,
                recipeId: 'emailpassword',
                email: user.email,
              },
            ],
          },
        });
    },
  });

  server.route({
    url: '/auth-api/signin',
    method: 'POST',
    async handler(req, rep) {
      if (await rateLimiter.isFastifyRouteRateLimited(req)) {
        return rep.send({
          status: 'GENERAL_ERROR',
          message: 'Please try again later.',
        });
      }

      const parsedBody = SignInBodyModel.safeParse(req.body);

      if (!parsedBody.success) {
        return rep.send(401);
      }

      const email = parsedBody.data.formFields.find(field => field.id === 'email')?.value ?? '';
      const password =
        parsedBody.data.formFields.find(field => field.id === 'password')?.value ?? '';

      const user = await supertokensStore.findEmailPasswordUserByEmail(email);

      if (!user) {
        return rep.send({
          status: 'WRONG_CREDENTIALS_ERROR',
        });
      }

      const passwordMatch = await comparePassword(password, user.passwordHash);

      if (!passwordMatch) {
        return rep.send({
          status: 'WRONG_CREDENTIALS_ERROR',
        });
      }

      const result = await storage.ensureUserExists({
        superTokensUserId: user.userId,
        email: user.email,
        oidcIntegration: null,
        // They are not available during sign in.
        firstName: null,
        lastName: null,
      });

      if (!result.ok) {
        return rep.send({
          status: 'SIGN_IN_NOT_ALLOWED',
          reason: result.reason,
        });
      }

      const { session, refreshToken, accessToken } = await createNewSession(
        supertokensStore,
        {
          hiveUser: result.user,
          oidcIntegrationId: null,
          superTokensUserId: user.userId,
        },
        {
          refreshTokenKey: secrets.refreshTokenKey,
          accessTokenKey,
        },
      );
      const frontToken = createFrontToken({
        superTokensUserId: user.userId,
        accessToken,
      });

      return rep
        .setCookie('sRefreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .setCookie('sAccessToken', accessToken.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .header('front-token', frontToken)
        .header('access-control-expose-headers', 'front-token')
        .send({
          status: 'OK',
          user: {
            id: user.userId,
            isPrimaryUser: false,
            tenantIds: ['public'],
            timeJoined: user.timeJoined,
            emails: [user.email],
            phoneNumbers: [],
            thirdParty: [],
            loginMethods: [
              {
                tenantIds: ['public'],
                recipeUserId: user.userId,
                verified: false,
                timeJoined: user.timeJoined,
                recipeId: 'emailpassword',
                email: user.email,
              },
            ],
          },
        });
    },
  });

  server.route({
    url: '/auth-api/user/password/reset/token',
    method: 'POST',
    async handler(req, rep) {
      if (await rateLimiter.isFastifyRouteRateLimited(req)) {
        return rep.send({
          status: 'GENERAL_ERROR',
          message: 'Please try again later.',
        });
      }

      const parsedBody = UserPasswordResetTokenBodyModel.safeParse(req.body);

      if (!parsedBody.success) {
        return rep.send(401);
      }

      const email = parsedBody.data.formFields.find(field => field.id === 'email')?.value ?? '';

      const user = await supertokensStore.findEmailPasswordUserByEmail(email);

      if (!user) {
        req.log.debug('User not found via email.');
        return rep.send({
          status: 'OK',
        });
      }

      const token = getPasswordResetHash();

      await supertokensStore.createEmailPasswordResetToken({
        user,
        token: sha256(token),
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      const passwordResetLink = new URL(env.hiveServices.webApp.url);
      passwordResetLink.pathname = '/auth/reset-password';
      passwordResetLink.searchParams.set('rid', 'thirdpartyemailpassword');
      passwordResetLink.searchParams.set('tenantId', 'public');
      passwordResetLink.searchParams.set('token', token);

      await taskScheduler.scheduleTask(PasswordResetTask, {
        user: {
          id: 'noop',
          email: user.email,
        },
        passwordResetLink: passwordResetLink.toString(),
      });

      return rep.status(200).send({
        status: 'OK',
      });
    },
  });

  server.route({
    url: '/auth-api/user/password/reset',
    method: 'POST',
    async handler(req, rep) {
      if (await rateLimiter.isFastifyRouteRateLimited(req)) {
        return rep.send({
          status: 'GENERAL_ERROR',
          message: 'Please try again later.',
        });
      }

      const parsedBody = UserPasswordResetBodyModel.safeParse(req.body);

      if (!parsedBody.success) {
        return rep.status(401).send();
      }

      const newPassword =
        parsedBody.data.formFields.find(field => field.id === 'password')?.value ?? '';

      const passwordValidation = validatePassword(newPassword);

      if (passwordValidation.status === 'INVALID') {
        return rep.send({
          status: 'FIELD_ERROR',
          formFields: [
            {
              id: 'password',
              error: passwordValidation.message,
            },
          ],
        });
      }

      const token = sha256(parsedBody.data.token);
      const newPasswordHash = await hashPassword(newPassword);

      const result = await supertokensStore.updateEmailPasswordBasedOnResetToken({
        token,
        newPasswordHash,
      });

      if (!result) {
        return rep.send({
          status: 'RESET_PASSWORD_INVALID_TOKEN_ERROR',
        });
      }

      return rep.send({
        status: 'OK',
      });
    },
  });

  server.route({
    url: '/auth-api/session/refresh',
    method: 'POST',
    async handler(req, rep) {
      if (await rateLimiter.isFastifyRouteRateLimited(req)) {
        return rep.status(401).send();
      }

      const refreshToken = req.cookies['sRefreshToken'] ?? null;

      if (!refreshToken) {
        req.log.debug('No refresh token provided.');
        return rep.status(404).send();
      }

      const parseResult = parseRefreshToken(refreshToken, secrets.refreshTokenKey);

      if (parseResult.type === 'error') {
        req.log.debug('Wrong refresh token version provided. err=%s', parseResult.code);
        return unsetAuthCookies(rep).status(404).send();
      }

      const { payload } = parseResult;

      // 1. lookup refresh token based on hash and check if it is invalid or rejected
      const session = await supertokensStore.getSessionInfo(payload.sessionHandle);

      if (!session) {
        req.log.debug('The referenced session does not exist.');
        return unsetAuthCookies(rep).status(404).send();
      }

      if (session.expiresAt < Date.now()) {
        req.log.debug('The session has expired.');
        return unsetAuthCookies(rep).status(404).send();
      }

      if (
        !payload.parentRefreshTokenHash1 &&
        sha256(sha256(refreshToken)) !== session.refreshTokenHash2
      ) {
        req.log.debug('The refreshTokenHash2 does not match (first refresh).');
        return unsetAuthCookies(rep).status(404).send();
      }

      if (
        payload.parentRefreshTokenHash1 &&
        session.refreshTokenHash2 !== sha256(payload.parentRefreshTokenHash1)
      ) {
        req.log.debug('The refreshTokenHash2 does not match.');
        return unsetAuthCookies(rep).status(404).send();
      }

      // 2. create a new refresh token
      const parentTokenHash = sha256(refreshToken);

      const newRefreshToken = createRefreshToken(
        {
          sessionHandle: session.sessionHandle,
          userId: session.userId,
          parentRefreshTokenHash1: sha256(refreshToken),
        },
        secrets.refreshTokenKey,
      );

      // 2,5. store new parentTokenHash in DB
      const updatedSession = await supertokensStore.updateSessionRefreshHash(
        session.sessionHandle,
        session.refreshTokenHash2,
        sha256(parentTokenHash),
      );

      if (!updatedSession) {
        req.log.debug(
          'The session has expired (another refresh for the same access token was completed, while this request was in flight).',
        );
        return unsetAuthCookies(rep).status(404).send();
      }

      // 3. create a new access token
      const accessToken = createAccessToken(
        {
          sub: session.userId,
          sessionHandle: session.sessionHandle,
          sessionData: JSON.parse(session.sessionData),
          refreshTokenHash1: sha256(newRefreshToken),
          parentRefreshTokenHash1: parentTokenHash,
        },
        accessTokenKey,
      );

      const frontToken = createFrontToken({
        superTokensUserId: session.userId,
        accessToken,
      });

      return rep
        .setCookie('sRefreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .setCookie('sAccessToken', accessToken.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .header('front-token', frontToken)
        .header('access-control-expose-headers', 'front-token')
        .send();
    },
  });

  server.route({
    url: '/auth-api/authorisationurl',
    method: 'GET',
    async handler(req, rep) {
      if (await rateLimiter.isFastifyRouteRateLimited(req)) {
        return rep.send({
          status: 'GENERAL_ERROR',
          message: 'Please try again later.',
        });
      }
      const query = AuthorisationurlQueryParamsModel.safeParse(req.query);

      if (!query.success) {
        req.log.debug('Invalid input provided.');
        return rep.status(200).send({
          status: 'GENERAL_ERROR',
          message: 'Something went wrong.',
        });
      }

      if (query.data.thirdPartyId === 'github') {
        if (!env.auth.github) {
          req.log.debug('The github provider is not enabled.');
          return rep.status(200).send({
            status: 'GENERAL_ERROR',
            message: 'Method not supported.',
          });
        }

        const state = oidClient.randomState();
        const pkceVerifier = oidClient.randomPKCECodeVerifier();
        const codeChallenge = await oidClient.calculatePKCECodeChallenge(pkceVerifier);

        const redirectUrl = new URL(env.hiveServices.webApp.url);
        redirectUrl.pathname = '/auth/callback/github';
        const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
        authorizeUrl.searchParams.set('client_id', env.auth.github.clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUrl.toString());
        authorizeUrl.searchParams.set('scope', ['read:user', 'user:email'].join(' '));
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('code_challenge', codeChallenge);
        authorizeUrl.searchParams.set('code_challenge_method', 'S256');

        await oauthCache.put(state, {
          method: 'github',
          oidIntegrationId: null,
          pkceVerifier,
        });

        return rep.send({
          status: 'OK',
          urlWithQueryParams: authorizeUrl.toString(),
        });
      }
      if (query.data.thirdPartyId === 'google') {
        if (!env.auth.google) {
          req.log.debug('The google provider is not enabled.');
          return rep.status(200).send({
            status: 'GENERAL_ERROR',
            message: 'Method not supported.',
          });
        }

        const state = oidClient.randomState();
        const pkceVerifier = oidClient.randomPKCECodeVerifier();
        const codeChallenge = await oidClient.calculatePKCECodeChallenge(pkceVerifier);

        const redirectUrl = new URL(env.hiveServices.webApp.url);
        redirectUrl.pathname = '/auth/callback/google';
        const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authorizeUrl.searchParams.set('client_id', env.auth.google.clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUrl.toString());
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set(
          'scope',
          [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid',
          ].join(' '),
        );
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('code_challenge', codeChallenge);
        authorizeUrl.searchParams.set('code_challenge_method', 'S256');

        await oauthCache.put(state, {
          method: 'google',
          oidIntegrationId: null,
          pkceVerifier,
        });

        return rep.send({
          status: 'OK',
          urlWithQueryParams: authorizeUrl.toString(),
        });
      }
      if (query.data.thirdPartyId === 'okta') {
        if (!env.auth.okta) {
          req.log.debug('The okta provider is not enabled.');
          return rep.status(200).send({
            status: 'GENERAL_ERROR',
            message: 'Method not supported.',
          });
        }

        const state = oidClient.randomState();
        const pkceVerifier = oidClient.randomPKCECodeVerifier();
        const codeChallenge = await oidClient.calculatePKCECodeChallenge(pkceVerifier);

        const redirectUrl = new URL(env.hiveServices.webApp.url);
        redirectUrl.pathname = '/auth/callback/okta';
        const authorizeUrl = new URL(env.auth.okta.endpoint);
        authorizeUrl.pathname = '/oauth2/v1/authorize';

        authorizeUrl.searchParams.set('client_id', env.auth.okta.clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUrl.toString());
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set(
          'scope',
          ['openid', 'email', 'profile', 'okta.users.read.self'].join(' '),
        );
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('code_challenge', codeChallenge);
        authorizeUrl.searchParams.set('code_challenge_method', 'S256');

        await oauthCache.put(state, {
          method: 'okta',
          oidIntegrationId: null,
          pkceVerifier,
        });

        return rep.send({
          status: 'OK',
          urlWithQueryParams: authorizeUrl.toString(),
        });
      }
      if (query.data.thirdPartyId === 'oidc') {
        if (!query.data.oidc_id) {
          req.log.debug('Missing oidc_id parameter.');
          return rep.status(200).send({
            status: 'GENERAL_ERROR',
            message: 'Something went wrong.',
          });
        }

        const oidcIntegration = await storage.getOIDCIntegrationById({
          oidcIntegrationId: query.data.oidc_id,
        });

        if (!oidcIntegration) {
          return rep.status(200).send({
            status: 'GENERAL_ERROR',
            message: 'Something went wrong. Please try again',
          });
        }

        const scopes = ['openid', 'email', ...oidcIntegration.additionalScopes];

        const oidClientConfig = new oidClient.Configuration(
          {
            issuer: oidcIntegration.id,
            authorization_endpoint: oidcIntegration.authorizationEndpoint,
            userinfo_endpoint: oidcIntegration.userinfoEndpoint,
            token_endpoint: oidcIntegration.tokenEndpoint,
          },
          oidcIntegration.clientId,
          {
            client_secret: crypto.decrypt(oidcIntegration.encryptedClientSecret),
          },
        );
        oidClient.allowInsecureRequests(oidClientConfig);

        const redirect_uri = new URL(env.hiveServices.webApp.url);
        redirect_uri.pathname = '/auth/callback/oidc';

        const pkceVerifier = oidClient.randomPKCECodeVerifier();
        const codeChallenge = await oidClient.calculatePKCECodeChallenge(pkceVerifier);

        let parameters: Record<string, string> = {
          redirect_uri: redirect_uri.toString(),
          scope: scopes.join(' '),
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        };

        let redirectTo = oidClient.buildAuthorizationUrl(oidClientConfig, parameters);
        const state = oidClient.randomState();

        redirectTo.searchParams.set('state', state);
        await oauthCache.put(state, {
          method: 'oidc',
          oidIntegrationId: oidcIntegration.id,
          pkceVerifier,
        });

        broadcastLog(
          oidcIntegration.id,
          `redirect client to oauth provider ${redirectTo.toString()}`,
        );

        return rep.send({
          status: 'OK',
          urlWithQueryParams: redirectTo.toString(),
        });
      }

      req.log.debug('unknown login method %s', query.data.thirdPartyId);
      return rep.status(200).send({
        status: 'GENERAL_ERROR',
        message: 'Something went wrong.',
      });
    },
  });

  server.route({
    url: '/auth-api/signinup',
    method: 'POST',
    async handler(req, rep) {
      if (await rateLimiter.isFastifyRouteRateLimited(req)) {
        return rep.send({
          status: 'GENERAL_ERROR',
          message: 'Please try again later.',
        });
      }

      const parsedBody = ThirdPartySigninupModel.safeParse(req.body);

      if (!parsedBody.success) {
        req.log.debug('Invalid body provided.');
        return rep.status(200).send({
          status: 'SIGN_IN_UP_NOT_ALLOWED',
          reason: 'Please try again.',
        });
      }

      let supertokensUser: EmailPasswordOrThirdPartyUser;
      let hiveUser: User;

      if (parsedBody.data.thirdPartyId === 'github') {
        if (!env.auth.github) {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'GitHub sign in is not allowed.',
          });
        }

        const state = parsedBody.data.redirectURIInfo.redirectURIQueryParams.state ?? '';

        const cacheRecord = await oauthCache.get(state);

        if (cacheRecord?.method !== 'github') {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Please try again.',
          });
        }

        const accessTokenUrl = new URL('https://github.com/login/oauth/access_token');

        const AccessTokenResponseBodyModel = z.object({
          access_token: z.string(),
          scope: z.string(),
        });

        const accessTokenResponse = await fetch(accessTokenUrl.toString(), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: env.auth.github.clientId,
            client_secret: env.auth.github.clientSecret,
            code: parsedBody.data.redirectURIInfo.redirectURIQueryParams.code,
            redirect_uri: parsedBody.data.redirectURIInfo.redirectURIOnProviderDashboard,
            code_verifier: cacheRecord.pkceVerifier,
          }),
        });

        if (accessTokenResponse.status !== 200) {
          req.log.debug('Received invalid response status from github.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Something went wrong.',
          });
        }

        const accessTokenBody = await accessTokenResponse
          .json()
          .then(res => AccessTokenResponseBodyModel.parse(res));

        const UserInfoResponseModel = z.object({
          id: z.number(),
        });

        const userInfoResponse = await fetch('https://api.github.com/user', {
          method: 'GET',
          headers: {
            accept: 'application/vnd.github+json',
            'x-gitHub-api-version': '2022-11-28',
            authorization: `Bearer ${accessTokenBody.access_token}`,
          },
        });

        if (userInfoResponse.status !== 200) {
          req.log.debug('Received invalid response status from github user lookup.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Something went wrong.',
          });
        }

        const userInfoBody = await userInfoResponse
          .json()
          .then(res => UserInfoResponseModel.parse(res));

        let user = await supertokensStore.findThirdPartyUser({
          thirdPartyId: 'github',
          thirdPartyUserId: String(userInfoBody.id),
        });

        if (!user) {
          const EmailsBodyModel = z.array(
            z.object({
              email: z.string(),
              verified: z.boolean(),
              primary: z.boolean(),
            }),
          );

          const emailsResponse = await fetch('https://api.github.com/user/emails', {
            method: 'GET',
            headers: {
              accept: 'application/vnd.github+json',
              'x-gitHub-api-version': '2022-11-28',
              authorization: `Bearer ${accessTokenBody.access_token}`,
            },
          });

          if (emailsResponse.status !== 200) {
            req.log.debug('Received invalid response status from github email lookup.');
            return rep.status(200).send({
              status: 'SIGN_IN_UP_NOT_ALLOWED',
              reason: 'Something went wrong.',
            });
          }

          const emailsBody = await emailsResponse.json().then(res => EmailsBodyModel.parse(res));

          const email = emailsBody.find(email => email.primary) ?? null;

          if (!email) {
            req.log.debug('Failed to find primary email address from GitHub API.');
            return rep.status(200).send({
              status: 'SIGN_IN_UP_NOT_ALLOWED',
              reason: 'Something went wrong.',
            });
          }

          user = await supertokensStore.createThirdPartyUser({
            email: email?.email,
            thirdPartyId: 'github',
            thirdPartyUserId: String(userInfoBody.id),
          });
        }

        const ensureUserExists = await storage.ensureUserExists({
          superTokensUserId: user.userId,
          email: user.email,
          firstName: null,
          lastName: null,
          oidcIntegration: null,
        });

        if (!ensureUserExists.ok) {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in not allowed.',
          });
        }

        supertokensUser = user;
        hiveUser = ensureUserExists.user;
      } else if (parsedBody.data.thirdPartyId === 'google') {
        if (!env.auth.google) {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'GitHub sign in is not allowed.',
          });
        }

        const state = parsedBody.data.redirectURIInfo.redirectURIQueryParams.state ?? '';

        const cacheRecord = await oauthCache.get(state);

        if (cacheRecord?.method !== 'google') {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Please try again.',
          });
        }

        const accessTokenUrl = new URL('https://oauth2.googleapis.com/token');

        const AccessTokenResponseBodyModel = z.object({
          access_token: z.string(),
          scope: z.string(),
        });

        const accessTokenResponse = await fetch(accessTokenUrl.toString(), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: env.auth.google.clientId,
            client_secret: env.auth.google.clientSecret,
            code: parsedBody.data.redirectURIInfo.redirectURIQueryParams.code,
            redirect_uri: parsedBody.data.redirectURIInfo.redirectURIOnProviderDashboard,
            code_verifier: cacheRecord.pkceVerifier,
          }),
        });

        if (accessTokenResponse.status !== 200) {
          req.log.debug(
            'Received invalid response status from google. %s',
            await accessTokenResponse.text(),
          );
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Something went wrong.',
          });
        }

        const accessTokenBody = await accessTokenResponse
          .json()
          .then(res => AccessTokenResponseBodyModel.parse(res));

        const UserInfoBodyModel = z.object({
          sub: z.string(),
          email: z.string(),
        });

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          method: 'GET',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${accessTokenBody.access_token}`,
          },
        });

        if (userInfoResponse.status !== 200) {
          req.log.debug('Received invalid response status from google user info endpoint.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Something went wrong.',
          });
        }

        const userInfo = await userInfoResponse.json().then(UserInfoBodyModel.parse);

        let user = await supertokensStore.findThirdPartyUser({
          thirdPartyId: 'google',
          thirdPartyUserId: String(userInfo.sub),
        });

        if (!user) {
          user = await supertokensStore.createThirdPartyUser({
            thirdPartyId: 'google',
            thirdPartyUserId: userInfo.sub,
            email: userInfo.email,
          });
        }

        const ensureUserExists = await storage.ensureUserExists({
          superTokensUserId: user.userId,
          email: user.email,
          firstName: null,
          lastName: null,
          oidcIntegration: null,
        });

        if (!ensureUserExists.ok) {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in not allowed.',
          });
        }

        supertokensUser = user;
        hiveUser = ensureUserExists.user;
      } else if (parsedBody.data.thirdPartyId === 'okta') {
        if (!env.auth.okta) {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Okta sign in is not allowed.',
          });
        }

        const state = parsedBody.data.redirectURIInfo.redirectURIQueryParams.state ?? '';

        const cacheRecord = await oauthCache.get(state);

        if (cacheRecord?.method !== 'okta') {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Please try again.',
          });
        }

        const current_url = new URL(env.hiveServices.webApp.url);
        current_url.pathname = '/auth/callback/okta';

        const GrantResponseModel = z.object({
          access_token: z.string(),
        });

        const grantResponse = await fetch(env.auth.okta.endpoint + '/oauth2/v1/token', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code_verifier: cacheRecord.pkceVerifier,
            code: parsedBody.data.redirectURIInfo.redirectURIQueryParams.code ?? '',
            redirect_uri: current_url.toString(),
            client_id: env.auth.okta.clientId,
            client_secret: env.auth.okta.clientSecret,
          }),
        });

        if (grantResponse.status != 200) {
          req.log.debug(
            'received non 200 status from token endpoint %d %s',
            grantResponse.status,
            await grantResponse.text(),
          );
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const grantResponseRaw = await grantResponse.text();
        const grantResponseJSON = parseJSONSafe(grantResponseRaw);

        if (grantResponseJSON.type === 'error') {
          req.log.debug('received malformed json body from token endpoint');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const grantBodyResult = GrantResponseModel.safeParse(grantResponseJSON.data);

        if (!grantBodyResult.success) {
          req.log.debug('received invalid json body from token endpoint');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const accessToken = grantBodyResult.data.access_token;

        const response = await fetch(`${env.auth.okta.endpoint}/api/v1/users/me`, {
          method: 'GET',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.status !== 200) {
          throw new Error(`Unexpected status code from Okta API: ${response.status}`);
        }

        const OktaProfileModel = z.object({
          id: z.string(),
          profile: z.object({
            email: z.string(),
          }),
        });

        const json = await response.json();
        const profile = OktaProfileModel.parse(json);

        let user = await supertokensStore.findThirdPartyUser({
          thirdPartyId: 'okta',
          thirdPartyUserId: profile.id,
        });

        if (!user) {
          user = await supertokensStore.createThirdPartyUser({
            email: profile.profile.email,
            thirdPartyId: 'okta',
            thirdPartyUserId: profile.id,
          });
        }

        const ensureUserExists = await storage.ensureUserExists({
          superTokensUserId: user.userId,
          email: user.email,
          firstName: null,
          lastName: null,
          oidcIntegration: null,
        });

        if (!ensureUserExists.ok) {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in not allowed.',
          });
        }

        supertokensUser = user;
        hiveUser = ensureUserExists.user;
      } else if (parsedBody.data.thirdPartyId === 'oidc') {
        req.log.debug('perform oidc signinup flow');
        // for backwards-compatibility purposes we support the case where the frontend modifies the state to append the oidc id
        const [state] = (parsedBody.data.redirectURIInfo.redirectURIQueryParams.state ?? '').split(
          '--',
        );

        const cacheRecord = await oauthCache.get(state);

        if (!cacheRecord?.oidIntegrationId || cacheRecord.method !== 'oidc') {
          req.log.debug('failed looking up pending oauth cache record.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Please try again.',
          });
        }

        const oidcIntegration = await storage.getOIDCIntegrationById({
          oidcIntegrationId: cacheRecord.oidIntegrationId,
        });

        if (!oidcIntegration) {
          req.log.debug('The oidc integration does not exist.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Please try again.',
          });
        }

        const current_url = new URL(env.hiveServices.webApp.url);
        current_url.pathname = '/auth/callback/oidc';

        req.log.debug('attempt exchanging auth code for auth token');

        broadcastLog(
          oidcIntegration.id,
          `attempt exchanging auth code for auth token on endpoint '${oidcIntegration.tokenEndpoint}'.`,
        );

        const GrantResponseModel = z.object({
          access_token: z.string(),
        });

        const grantResponse = await fetch(oidcIntegration.tokenEndpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code_verifier: cacheRecord.pkceVerifier,
            code: parsedBody.data.redirectURIInfo.redirectURIQueryParams.code ?? '',
            redirect_uri: current_url.toString(),
            client_id: oidcIntegration.clientId,
            client_secret: crypto.decrypt(oidcIntegration.encryptedClientSecret),
          }),
        });

        if (grantResponse.status != 200) {
          req.log.debug('received non 200 status from token endpoint %d', grantResponse.status);
          broadcastLog(
            oidcIntegration.id,
            `an unexpected error occured while calling your token endoint '${oidcIntegration.tokenEndpoint}'. HTTP Status: ${grantResponse.status} Body: ${await grantResponse.text()}.`,
          );

          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const grantResponseRaw = await grantResponse.text();
        const grantResponseJSON = parseJSONSafe(grantResponseRaw);

        if (grantResponseJSON.type === 'error') {
          req.log.debug('received malformed json body from token endpoint');

          broadcastLog(
            oidcIntegration.id,
            `unexpected body received from the token endpoint '${oidcIntegration.tokenEndpoint}'. Failed parsing JSON. HTTP Status: ${grantResponse.status}.'`,
          );

          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const grantBodyResult = GrantResponseModel.safeParse(grantResponseJSON.data);

        if (!grantBodyResult.success) {
          console.log(grantResponseJSON);
          req.log.debug('received invalid json body from token endpoint');
          broadcastLog(
            oidcIntegration.id,
            `the response from your token endpoint '${oidcIntegration.tokenEndpoint}' did not contain a 'access_token' property.`,
          );

          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const codeGrantAccessToken = grantBodyResult.data.access_token;
        req.log.debug('successfully exchanged code for access token ');
        req.log.debug('attempt fetching user info');

        const userInfoResponse = await fetch(oidcIntegration.userinfoEndpoint, {
          method: 'GET',
          headers: {
            authorization: `Bearer ${codeGrantAccessToken}`,
          },
        });

        if (userInfoResponse.status != 200) {
          req.log.debug(
            'received invalid status from user info endpoint %d',
            userInfoResponse.status,
          );
          broadcastLog(
            oidcIntegration.id,
            `an unexpected error occured while calling the user info endoint '${oidcIntegration.userinfoEndpoint}'. HTTP Status: ${grantResponse.status} Body: ${await grantResponse.text()}.`,
          );

          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const userInfoBodyRaw = await userInfoResponse.text();
        const userInfoBodyJSON = parseJSONSafe(userInfoBodyRaw);

        if (userInfoBodyJSON.type === 'error') {
          req.log.debug('received malformed JSON body from user info endpoint');
          broadcastLog(
            oidcIntegration.id,
            `unexpected body received from the user info endpoint '${oidcIntegration.userinfoEndpoint}'. Failed parsing JSON. HTTP Status: ${grantResponse.status}. HTTP Body: '${userInfoBodyRaw}'`,
          );

          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        const userInfoBody = z
          .object({
            sub: z.string(),
            email: z.string().optional().nullable(),
          })
          .safeParse(userInfoBodyJSON.data);

        if (!userInfoBody.success) {
          req.log.debug('received invalid JSON body from user info endpoint');
          broadcastLog(
            oidcIntegration.id,
            `unexpected body received from the user info endpoint '${oidcIntegration.userinfoEndpoint}'. Expected 'sub' and 'email' grant. HTTP Status: ${grantResponse.status}. HTTP Body: '${userInfoBodyRaw}'`,
          );

          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        if (!userInfoBody.data.email) {
          req.log.debug('user info endpoint response did not contain the email grant');
          broadcastLog(
            oidcIntegration.id,
            `missing email grant received from user info endpoint '${oidcIntegration.userinfoEndpoint}. HTTP Status: ${grantResponse.status}. HTTP Body: '${userInfoBodyRaw}'`,
          );

          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in failed. Please contact your origanization administrator.',
          });
        }

        req.log.debug('lookup existing user for sub and oidc integration');

        let user = await supertokensStore.findOIDCUserBySubAndOIDCIntegrationId({
          oidcIntegrationId: oidcIntegration.id,
          sub: userInfoBody.data.sub,
        });

        if (!user) {
          req.log.debug('no existing user found. create new one.');
          user = await supertokensStore.createOIDCUser({
            email: userInfoBody.data.email,
            oidcIntegrationId: oidcIntegration.id,
            sub: userInfoBody.data.sub,
          });
        }

        req.log.debug('supertokens user provisioned. ensure hive user exists');

        const ensureUserExists = await storage.ensureUserExists({
          superTokensUserId: user.userId,
          email: userInfoBody.data.email,
          firstName: null,
          lastName: null,
          oidcIntegration: {
            id: oidcIntegration.id,
            defaultScopes: [],
          },
        });

        if (!ensureUserExists.ok) {
          req.log.debug('creating hive user is not allowed. Reason: %s', ensureUserExists.reason);
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Sign in not allowed.',
          });
        }
        supertokensUser = user;
        hiveUser = ensureUserExists.user;
      } else {
        return rep.status(200).send({
          status: 'SIGN_IN_UP_NOT_ALLOWED',
          reason: 'Unsupported sing in method.',
        });
      }

      req.log.debug('create new session for user');

      const { session, refreshToken, accessToken } = await createNewSession(
        supertokensStore,
        {
          hiveUser: hiveUser,
          oidcIntegrationId: null,
          superTokensUserId: supertokensUser.userId,
        },
        {
          refreshTokenKey: secrets.refreshTokenKey,
          accessTokenKey,
        },
      );
      const frontToken = createFrontToken({
        superTokensUserId: supertokensUser.userId,
        accessToken,
      });

      return rep
        .setCookie('sRefreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .setCookie('sAccessToken', accessToken.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .header('front-token', frontToken)
        .header('access-control-expose-headers', 'front-token')
        .send({
          status: 'OK',
          user: {
            id: supertokensUser.userId,
            isPrimaryUser: false,
            tenantIds: ['public'],
            timeJoined: supertokensUser.timeJoined,
            emails: [supertokensUser.email],
            phoneNumbers: [],
            thirdParty: [
              {
                id: supertokensUser.thirdPartyId,
                userId: supertokensUser.thirdPartyUserId,
              },
            ],
            loginMethods: [
              {
                tenantIds: ['public'],
                recipeUserId: supertokensUser.userId,
                verified: false,
                timeJoined: supertokensUser.timeJoined,
                recipeId: 'thirdparty',
                email: supertokensUser.email,
              },
            ],
          },
        });
    },
  });
}

const GenericFormFieldBody = z.object({
  formFields: z.array(
    z.object({
      id: z.string(),
      value: z.string(),
    }),
  ),
});

const SignUpBodyModel = GenericFormFieldBody.extend({});

const SignInBodyModel = GenericFormFieldBody.extend({});

const UserPasswordResetBodyModel = GenericFormFieldBody.extend({
  method: z.literal('token'),
  token: z.string(),
});

const UserPasswordResetTokenBodyModel = GenericFormFieldBody.extend({});

const AuthorisationurlQueryParamsModel = z.object({
  thirdPartyId: z.string(),
  redirectURIOnProviderDashboard: z.string(),
  oidc_id: z.string().optional(),
});

const ThirdPartySigninupModel = z.object({
  thirdPartyId: z.string(),
  redirectURIInfo: z.object({
    // pkceCodeVerifier: z.string(),
    redirectURIOnProviderDashboard: z.string(),
    redirectURIQueryParams: z.object({
      code: z.string().optional(),
      iss: z.string().optional(),
      redirectToPath: z.string().optional(),
      scope: z.string().optional(),
      session_state: z.string().optional(),
      state: z.string().optional(),
    }),
  }),
});

function parseJSONSafe(input: string):
  | {
      type: 'error';
      error: unknown;
    }
  | {
      type: 'success';
      data: unknown;
    } {
  try {
    return {
      type: 'success',
      data: JSON.parse(input),
    };
  } catch (error) {
    return {
      type: 'error',
      error,
    };
  }
}
