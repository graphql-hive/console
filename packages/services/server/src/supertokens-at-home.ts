import * as c from 'node:crypto';
import bcrypt from 'bcryptjs';
import { type FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import * as oidClient from 'openid-client';
import z from 'zod';
import cookie from '@fastify/cookie';
import { CryptoProvider, Storage, User } from '@hive/api';
import {
  EmailPasswordOrThirdPartyUser,
  SuperTokensStore,
} from '@hive/api/modules/auth/providers/supertokens-store';
import { TaskScheduler } from '@hive/workflows/kit';
import { PasswordResetTask } from '@hive/workflows/tasks/password-reset';
import { env } from './environment';

export function registerSupertokensAtHome(
  server: FastifyInstance,
  storage: Storage,
  taskScheduler: TaskScheduler,
  crypto: CryptoProvider,
) {
  const supertokensStore = new SuperTokensStore(storage.pool, server.log);

  server.register(cookie, {
    hook: 'onRequest',
    parseOptions: {},
  });

  server.route({
    url: '/auth-api/signout',
    method: 'POST',
    handler(_req, rep) {
      rep
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
        })
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
        return {
          status: 'GENERAL_ERROR',
          message: 'Invalid email provided.',
        };
      }

      // Lookup user
      let user = await supertokensStore.lookupEmailUserByEmail(email);

      if (user) {
        return {
          status: 'EMAIL_ALREADY_EXISTS_ERROR',
        };
      }

      // TODO: Validate password

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

      const { session, accessToken, refreshToken } = await createNewSession(supertokensStore, {
        hiveUser: ensureUserResult.user,
        oidcIntegrationId: null,
        superTokensUserId: user.userId,
      });
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

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

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

      const { session, refreshToken, accessToken } = await createNewSession(supertokensStore, {
        hiveUser: result.user,
        oidcIntegrationId: null,
        superTokensUserId: user.userId,
      });
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

      const token = c.randomBytes(32).toString('hex');

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
      const parsedBody = UserPasswordResetBodyModel.safeParse(req.body);

      if (!parsedBody.success) {
        return rep.status(401).send();
      }

      const newPassword =
        parsedBody.data.formFields.find(field => field.id === 'password')?.value ?? '';

      // TODO: validate password payload
      const token = sha256(parsedBody.data.token);
      const newPasswordHash = await hashPassword(newPassword);

      await supertokensStore.updateEmailPasswordBasedOnResetToken({
        token,
        newPasswordHash,
      });

      return rep.send({
        status: 'OK',
      });
    },
  });

  server.route({
    url: '/auth-api/session/refresh',
    method: 'POST',
    async handler(req, rep) {
      const refreshToken = req.cookies['sRefreshToken'] ?? null;

      if (!refreshToken) {
        req.log.debug('No refresh token provided.');
        return rep.status(404).send();
      }

      const [payload, nonce, version] = refreshToken.split('.');

      if (version !== 'V2') {
        req.log.debug('Wrong refresh token version provided.');
        return rep.status(404).send();
      }

      let refreshTokenPayload: RefreshTokenPayloadType;
      try {
        refreshTokenPayload = RefreshTokenPayloadModel.parse(
          JSON.parse(decryptRefreshToken(payload).toString('utf8')),
        );
      } catch (err) {
        req.log.debug('Failed to parse refresh token payload..');
        return rep.status(404).send();
      }

      if (refreshTokenPayload.nonce !== nonce) {
        req.log.debug('Wrong refresh token nonce provided.');
        return rep.status(404).send();
      }

      // 1. lookup refresh token based on hash and check if it is invalid or rejected
      const session = await supertokensStore.getSessionInfo(refreshTokenPayload.sessionHandle);

      if (!session) {
        req.log.debug('The referenced session does not exist.');
        return rep.status(404).send();
      }

      if (session.expiresAt < Date.now()) {
        req.log.debug('The session has expired.');
        return rep.status(404).send();
      }

      if (
        !refreshTokenPayload.parentRefreshTokenHash1 &&
        sha256(refreshToken) !== session.refreshTokenHash2
      ) {
        req.log.debug('The refreshTokenHash2 does not match (first refresh).');
        return rep.status(404).send();
      }

      if (
        refreshTokenPayload.parentRefreshTokenHash1 &&
        session.refreshTokenHash2 !== sha256(refreshTokenPayload.parentRefreshTokenHash1)
      ) {
        req.log.debug('The refreshTokenHash2 does not match.');
        return rep.status(404).send();
      }

      // 2. create a new refresh token
      const parentTokenHash = sha256(refreshToken);

      const newRefreshToken = createRefreshToken({
        sessionHandle: session.sessionHandle,
        userId: session.userId,
        parentRefreshTokenHash1: sha256(refreshToken),
      });

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
        return rep.status(404).send();
      }

      // 3. create a new access token
      const accessToken = createAccessToken(
        session.userId,
        session.sessionHandle,
        session.sessionData,
        sha256(newRefreshToken),
        parentTokenHash,
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
        const redirectUrl = new URL(env.hiveServices.webApp.url);
        redirectUrl.pathname = '/auth/callback/github';
        const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
        authorizeUrl.searchParams.set('client_id', env.auth.github.clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUrl.toString());
        authorizeUrl.searchParams.set('scope', ['read:user', 'user:email'].join(' '));

        return rep.send({
          status: 'OK',
          urlWithQueryParams: authorizeUrl.toString(),
        });
      }

      if (query.data.thirdPartyId === 'google') {
        req.log.debug('The google provider is not enabled.');
        if (!env.auth.google) {
          return rep.status(200).send({
            status: 'GENERAL_ERROR',
            message: 'Method not supported.',
          });
        }

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

        return rep.send({
          status: 'OK',
          urlWithQueryParams: authorizeUrl.toString(),
        });
      }
      // TODO: OKTA

      console.log(query.data.thirdPartyId);

      if (!query.data.oidc_id) {
        throw new Error('NOT SUPPORTED');
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

      let parameters: Record<string, string> = {
        redirect_uri: redirect_uri.toString(),
        scope: scopes.join(' '),
      };

      let redirectTo = oidClient.buildAuthorizationUrl(oidClientConfig, parameters);

      redirectTo.searchParams.set('state', oidcIntegration.id);

      return rep.send({
        status: 'OK',
        urlWithQueryParams: redirectTo.toString(),
      });
    },
  });

  server.route({
    url: '/auth-api/signinup',
    method: 'POST',
    async handler(req, rep) {
      console.log(req.body);
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
          }),
        });

        if (accessTokenResponse.status !== 200) {
          req.log.debug('Received invalid response status from google.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Something went wrong.',
          });
        }

        const accessTokenBody = await accessTokenResponse
          .json()
          .then(res => AccessTokenResponseBodyModel.parse(res));

        console.log(accessTokenBody);

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
      } else if (parsedBody.data.thirdPartyId === 'oidc') {
        const [, oidcIntegrationId] = (
          parsedBody.data.redirectURIInfo.redirectURIQueryParams.state ?? ''
        ).split('--');

        if (!oidcIntegrationId) {
          req.log.debug('Missing OIDC ID provided.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Please try again.',
          });
        }

        const oidcIntegration = await storage.getOIDCIntegrationById({ oidcIntegrationId });

        if (!oidcIntegration) {
          req.log.debug('The oidc integration does not exist.');
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Please try again.',
          });
        }

        const oidClientConfig = new oidClient.Configuration(
          {
            issuer: parsedBody.data.redirectURIInfo.redirectURIQueryParams.iss ?? '',
            authorization_endpoint: oidcIntegration.authorizationEndpoint,
            userinfo_endpoint: oidcIntegration.userinfoEndpoint,
            token_endpoint: oidcIntegration.tokenEndpoint,
          },
          oidcIntegration.clientId,
          {
            client_secret: crypto.decrypt(oidcIntegration.encryptedClientSecret),
          },
        );

        // TODO
        oidClient.allowInsecureRequests(oidClientConfig);

        const current_url = new URL(env.hiveServices.webApp.url);
        current_url.pathname = '/auth/callback/oidc';
        current_url.searchParams.set(
          'code',
          parsedBody.data.redirectURIInfo.redirectURIQueryParams.code ?? '',
        );

        // TODO: error handling
        const result = await oidClient.authorizationCodeGrant(oidClientConfig, current_url);

        const codeGrantAccessToken = result.access_token;

        const userInfo = await oidClient.fetchUserInfo(
          oidClientConfig,
          codeGrantAccessToken,
          oidClient.skipSubjectCheck,
        );

        if (!userInfo.email) {
          return rep.status(200).send({
            status: 'SIGN_IN_UP_NOT_ALLOWED',
            reason: 'Missing email claim.',
          });
        }

        let user = await supertokensStore.findOIDCUserBySubAndOIDCIntegrationId({
          oidcIntegrationId: oidcIntegration.id,
          sub: userInfo.sub,
        });

        if (!user) {
          user = await supertokensStore.createOIDCUser({
            email: userInfo.email,
            oidcIntegrationId: oidcIntegration.id,
            sub: userInfo.sub,
          });
        }

        const ensureUserExists = await storage.ensureUserExists({
          superTokensUserId: user.userId,
          email: userInfo.email,
          firstName: null,
          lastName: null,
          oidcIntegration: {
            id: oidcIntegration.id,
            defaultScopes: [],
          },
        });

        if (!ensureUserExists.ok) {
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

      const { session, refreshToken, accessToken } = await createNewSession(supertokensStore, {
        hiveUser: hiveUser,
        oidcIntegrationId: null,
        superTokensUserId: supertokensUser.userId,
      });
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

async function hashPassword(plaintextPassword: string): Promise<string> {
  // The "cost factor" or salt rounds. 10 is a good, standard balance of security and performance.
  // This value is included in the final hash string itself.
  const saltRounds = 10;

  // bcrypt.hash handles the generation of a random salt and the hashing process.
  // The operation is asynchronous to prevent blocking the event loop.
  const hash = await bcrypt.hash(plaintextPassword, saltRounds);

  return hash;
}

async function createNewSession(
  supertokensStore: SuperTokensStore,
  args: {
    superTokensUserId: string;
    hiveUser: User;
    oidcIntegrationId: string | null;
  },
) {
  const sessionHandle = crypto.randomUUID();
  // 1 week for now
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1_000;

  const refreshToken = createRefreshToken({
    sessionHandle,
    userId: args.superTokensUserId,
    parentRefreshTokenHash1: null,
  });

  const payload: SuperTokensSessionPayload = {
    version: '2',
    superTokensUserId: args.superTokensUserId,
    userId: args.hiveUser.id,
    oidcIntegrationId: args.oidcIntegrationId ?? null,
    email: args.hiveUser.email,
  };

  const stringifiedPayload = JSON.stringify(payload);

  const session = await supertokensStore.createSession(
    sessionHandle,
    args.superTokensUserId,
    stringifiedPayload,
    stringifiedPayload,
    sha256(refreshToken),
    expiresAt,
  );

  const accessToken = createAccessToken(
    args.superTokensUserId,
    sessionHandle,
    stringifiedPayload,
    sha256(refreshToken),
    null,
  );

  return {
    session,
    refreshToken,
    accessToken,
  };
}

// TODO: not hardcode this localhost value here :)
const UNSAFE_REFRESH_TOKEN_MASTER_KEY =
  '1000:15e5968d52a9a48921c1c63d88145441a8099b4a44248809a5e1e733411b3eeb80d87a6e10d3390468c222f6a91fef3427f8afc8b91ea1820ab10c7dfd54a268:39f72164821e08edd6ace99f3bd4e387f45fa4221fe3cd80ecfee614850bc5d647ac2fddc14462a00647fff78c22e8d01bc306a91294f5b889a90ba891bf0aa0';

function decryptRefreshToken(
  encodedData: string,
  masterKey: string = UNSAFE_REFRESH_TOKEN_MASTER_KEY,
) {
  // 1. Decode the incoming string (URL -> Base64 -> Buffer).
  const urlDecodedData = decodeURIComponent(encodedData);
  const buffer = Buffer.from(urlDecodedData, 'base64');

  // 2. Deconstruct the buffer based on the Java encryption logic.
  // The first 12 bytes are the IV.
  const iv = buffer.slice(0, 12);

  // The rest of the buffer is the encrypted data + 16-byte auth tag.
  const encryptedPayload = buffer.slice(12);

  // 3. Re-derive the secret key using PBKDF2. This is the critical step.
  // The parameters MUST match the Java side exactly.
  // The IV is used as the salt.
  const iterations = 100;
  const keylen = 32; // 32 bytes = 256 bits
  const digest = 'sha512'; // NOTE: This is a guess. See explanation below.

  const secretKey = c.pbkdf2Sync(masterKey, iv, iterations, keylen, digest);

  // 4. Separate the encrypted data from the authentication tag.
  const authTagLength = 16; // 128 bits
  const encryptedData = encryptedPayload.slice(0, -authTagLength);
  const authTag = encryptedPayload.slice(-authTagLength);

  // 5. Perform the decryption with the derived key and IV.
  const decipher = c.createDecipheriv('aes-256-gcm', secretKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData);
  decrypted += decipher.final('utf8');

  return decrypted;
}

function encryptRefreshToken(
  plaintext: string,
  masterKey: string = UNSAFE_REFRESH_TOKEN_MASTER_KEY,
) {
  // 1. Generate a random 12-byte IV (Initialization Vector), same as the Java side.
  const iv = c.randomBytes(12);

  // 2. Derive the secret key using PBKDF2. The IV is used as the salt.
  // The parameters (iterations, key length, and digest) match the Java implementation.
  const iterations = 100;
  const keylen = 32; // 32 bytes = 256 bits
  const digest = 'sha512'; // From "PBKDF2WithHmacSHA512"

  const secretKey = c.pbkdf2Sync(masterKey, iv, iterations, keylen, digest);

  // 3. Create the AES-256-GCM cipher.
  const cipher = c.createCipheriv('aes-256-gcm', secretKey, iv);

  // 4. Encrypt the plaintext.
  // The result is the ciphertext.
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // 5. Get the 16-byte authentication tag.
  // This is a crucial step in GCM.
  const authTag = cipher.getAuthTag();

  // 6. Concatenate everything in the correct order: IV + Ciphertext + Auth Tag.
  // This matches the Java `ByteBuffer` logic.
  const finalBuffer = Buffer.concat([iv, encrypted, authTag]);

  // 7. Base64-encode the final buffer and then URL-encode it for safe transport.
  const base64Data = finalBuffer.toString('base64');
  return encodeURIComponent(base64Data);
}

function createRefreshToken(args: {
  sessionHandle: string;
  userId: string;
  parentRefreshTokenHash1: string | null;
}) {
  const newNonce = sha256(crypto.randomUUID());

  const encryptedPayload = encryptRefreshToken(
    JSON.stringify({
      sessionHandle: args.sessionHandle,
      userId: args.userId,
      nonce: newNonce,
      parentRefreshTokenHash1: args.parentRefreshTokenHash1 ?? undefined,
    }),
  );

  const refreshToken = encryptedPayload + '.' + newNonce + '.' + 'V2';

  return refreshToken;
}

const SuperTokensSessionPayloadV2Model = z.object({
  version: z.literal('2'),
  superTokensUserId: z.string(),
  email: z.string(),
  userId: z.string(),
  oidcIntegrationId: z.string().nullable(),
});

type SuperTokensSessionPayload = z.TypeOf<typeof SuperTokensSessionPayloadV2Model>;

function sha256(str: string) {
  return c.createHash('sha256').update(str).digest('hex');
}

const AccessTokenInfoModel = z.object({
  iat: z.number(),
  sub: z.string(),
  tId: z.string(),
  rsub: z.string(),
  sessionHandle: z.string(),
  refreshTokenHash1: z.string(),
  parentRefreshTokenHash1: z.string().optional(), // Making this optional as it may not always be present
  antiCsrfToken: z.string().nullable(),
});

type AccessTokenInfo = z.TypeOf<typeof AccessTokenInfoModel>;

const UNSAFE_ACCESS_TOKEN_SIGNING_KEY =
  '-----BEGIN RSA PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCmrnawc+IN/NFQaZQj8ah/tezi6qiaF5NVsk4eoCyZbCEEef0AfJ96xYKwYWJe/BZebRvomaHv09a9swCW041P3QqjkUJRBfdKZpgqYwvXwcbXxbTw8UcGAIeLT8fDczaMbewZrxBf+VakgXQIYy7ekMPPx6VgQTJyP/tX4YUxC6HxeiPpdFCEc6DbuQqzLqr8I0N6B2jr3Gkw3WFq4Ui4zWfMD8pcgsrOlX6irsBT7MKt0KmyGGm92RFzESU075d9KJKEahNnWfkJfy2yBscF/H+cXUIa3To/Ps6XplG/f5L5ocw15pjJiCMg3prA6eaIRAKkbLmY3+2lj3gyPiArAgMBAAECggEAMfQNXBqOv/Rp4riRjigpgITMRsFe4Dd6j29NnD4Sv7Q5PPc2TMQMo6W34hZ9fcv9BDWc7JvGfXK2Y8nWvl0Od8XeH2E0R8YK88BFkEZ40SOg7R+yd5dH2tOjy6uQSdIoofN7k8L0nF7Eia7GUJExBcDK/mVt+afwb28fa5oJ6cV/m4IvN8tkIUH83erdx2p8zvAKiJT/Ljrq3UhstAAGHLT7k52A9CuKiJK7QiFViFNSpNZhz64VDIMkTalL9tyOHvOlI9Dfvjp6uipf2tGwmien24RckrewZHoK/NkLW0esPSDEoF0/ZBrkRvs+RyCJsEvVDVE9O4HsemWTafpeyQKBgQDdJpnAt5QIjNgmoMlKMiL1uptQ5p7bqNX11Jhz0l0A67cBi2+JzA00JRfOPD0JIV8niqCUhIfXC7u1OJcKXGMAG1pjql4HQWd6z6wLPGX05jq7GljHCf5xpKWiY5oYc6XNIcmE9NrJEqmGmJ4pKJ9NeUqCIoKnsxsjXLbyzVQuDQKBgQDA8odNzm6c6gLp0K/qZDy5z/SAUzWQ6IrL1RPG+HnuF4XwuwAzZ3y1fGPYTIZkUadwkQL6DbK2Zqvw73jEamfL9FYS6flw0joq2i4jL9ZYhOxSxXPNdy70PUuqrFnMnWq0JUeNbVz9dXzQC0nTJjUiI4kRBqyo5jW3ckEETHOxFwKBgBIF3E/tZh4QRGlZfy4RyfGWxKOiN94U82L2cXo28adqjl6M24kyXP0b7MW8+QhudM/HJ3ETH/LxnNmXBBAvGU5f7EzlDIaw2NsUY6QCxxhfTvgCnKuT7+2ZCnqifWNywVdnYoH4ZoAuiixS8cjO67Snpt/WKim6mgKWwr4k57BdAoGBAJqSMJ6+X5LJTagujJ9Dyfo5hHBBOMpr4LVGb9+YM2Xv5ldiF9kWcKubiQlA1PENEQx2v2G/E4pYWipcTe1cKOcVSNdCJZiicgLeYtPBgP/NDN2KXSke77iuWi3SgOYQveivbND56eMK+gBY6r2DAFHnEelX5X4xXpslprxg2tXlAoGACv2y3ImZdzaCtQfmD05mEIA8zQLtDMpteO+XFQ8uNZdeG0iBJCi/N523hi5Nbg4Y1jNccwBQQSpq7A17u/j/d6EmCuduosALVQY3ILpd3P8hf8wDOBO6JfAd6DTO3QcrArmFcoJTB2t2zGud9zqdzL1fWNV9/X3Zow2XmHox+CI=\n-----END RSA PRIVATE KEY-----';

function createAccessToken(
  sub: string,
  sessionHandle: string,
  sessionData: string,
  refreshTokenHash1: string,
  parentRefreshTokenHash1: string | null,
) {
  const now = Math.floor(Date.now() / 1000);
  // Access tokens expires in 6 hours
  const expiresIn = Math.floor(now + 60 * 60 * 6 * 1000);

  const data: AccessTokenInfo = {
    iat: now,
    sub,
    tId: 'public',
    rsub: sub,
    sessionHandle,
    antiCsrfToken: null,
    refreshTokenHash1,
    parentRefreshTokenHash1: parentRefreshTokenHash1 ?? undefined,
    ...JSON.parse(sessionData),
  };

  const token = jwt.sign(data, UNSAFE_ACCESS_TOKEN_SIGNING_KEY, {
    algorithm: 'RS256',
    expiresIn,
    keyid: 'd-1770648231409',
    header: {
      kid: 'd-1770648231409',
      typ: 'JWT',
      version: '5',
      alg: 'RS256',
    },
  });

  return { token, expiresIn, d: jwt.decode(token) };
}

function createFrontToken(args: {
  superTokensUserId: string;
  accessToken: ReturnType<typeof createAccessToken>;
}) {
  return Buffer.from(
    JSON.stringify({
      uid: args.superTokensUserId,
      ate: args.accessToken.expiresIn * 1000,
      up: args.accessToken.d,
    }),
  ).toString('base64');
}

const RefreshTokenPayloadModel = z.object({
  sessionHandle: z.string(),
  userId: z.string(),
  parentRefreshTokenHash1: z.string().optional(),
  nonce: z.string(),
});

type RefreshTokenPayloadType = z.TypeOf<typeof RefreshTokenPayloadModel>;
