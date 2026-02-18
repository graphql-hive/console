import { DatabasePool } from 'slonik';
import { z } from 'zod';
import {
  AccessTokenKeyContainer,
  hashPassword,
} from '@hive/api/src/modules/auth/lib/supertokens-at-home/crypto';
import { SuperTokensStore } from '@hive/api/src/modules/auth/providers/supertokens-store';
import { NoopLogger } from '@hive/api/src/modules/shared/providers/logger';
import type { InternalApi } from '@hive/server';
import { createNewSession } from '@hive/server/supertokens-at-home/shared';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { ensureEnv } from './env';
import { getServiceHost } from './utils';

const SignUpSignInUserResponseModel = z
  .object({
    status: z.literal('OK'),
    user: z.object({
      emails: z.array(z.string()),
      id: z.string(),
      timeJoined: z.number(),
    }),
  })
  .refine(response => response.user.emails.length === 1)
  .transform(response => ({
    ...response,
    user: {
      id: response.user.id,
      email: response.user.emails[0],
      timeJoined: response.user.timeJoined,
    },
  }));

const signUpUserViaEmail = async (
  email: string,
  password: string,
): Promise<z.TypeOf<typeof SignUpSignInUserResponseModel>> => {
  try {
    const response = await fetch(
      `${ensureEnv('SUPERTOKENS_CONNECTION_URI')}/appid-public/public/recipe/signup`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'api-key': ensureEnv('SUPERTOKENS_API_KEY'),
          'cdi-version': '4.0',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );
    const body = await response.text();

    if (response.status !== 200) {
      throw new Error(`Signup failed. ${response.status}.\n ${body}`);
    }

    return SignUpSignInUserResponseModel.parse(JSON.parse(body));
  } catch (e) {
    console.warn(`Failed to sign up:`, e);

    throw e;
  }
};

const createSessionAtHome = async (
  supertokensStore: SuperTokensStore,
  superTokensUserId: string,
  email: string,
  oidcIntegrationId: string | null,
) => {
  const graphqlAddress = await getServiceHost('server', 8082);

  const internalApi = createTRPCProxyClient<InternalApi>({
    links: [
      httpLink({
        url: `http://${graphqlAddress}/trpc`,
        fetch,
      }),
    ],
  });

  const ensureUserResult = await internalApi.ensureUser.mutate({
    superTokensUserId,
    email,
    oidcIntegrationId,
    firstName: null,
    lastName: null,
  });
  if (!ensureUserResult.ok) {
    throw new Error(ensureUserResult.reason);
  }

  const session = await createNewSession(
    supertokensStore,
    {
      superTokensUserId,
      hiveUser: ensureUserResult.user,
      oidcIntegrationId,
    },
    {
      refreshTokenKey: process.env.SUPERTOKENS_REFRESH_TOKEN_KEY!,
      accessTokenKey: new AccessTokenKeyContainer(process.env.SUPERTOKENS_ACCESS_TOKEN_KEY!),
    },
  );

  /**
   * These are the required cookies that need to be set.
   */
  return {
    access_token: session.accessToken.token,
    refresh_token: session.refreshToken,
  };
};

const createSessionPayload = (payload: {
  superTokensUserId: string;
  userId: string;
  oidcIntegrationId: string | null;
  email: string;
}) => ({
  version: '2',
  superTokensUserId: payload.superTokensUserId,
  userId: payload.userId,
  oidcIntegrationId: payload.oidcIntegrationId,
  email: payload.email,
});

const CreateSessionModel = z.object({
  accessToken: z.object({
    token: z.string(),
  }),
  refreshToken: z.object({
    token: z.string(),
  }),
});

const createSession = async (
  superTokensUserId: string,
  email: string,
  oidcIntegrationId: string | null,
) => {
  try {
    const graphqlAddress = await getServiceHost('server', 8082);

    const internalApi = createTRPCProxyClient<InternalApi>({
      links: [
        httpLink({
          url: `http://${graphqlAddress}/trpc`,
          fetch,
        }),
      ],
    });

    const ensureUserResult = await internalApi.ensureUser.mutate({
      superTokensUserId,
      email,
      oidcIntegrationId,
      firstName: null,
      lastName: null,
    });
    if (!ensureUserResult.ok) {
      throw new Error(ensureUserResult.reason);
    }

    const sessionData = createSessionPayload({
      superTokensUserId,
      userId: ensureUserResult.user.id,
      oidcIntegrationId,
      email,
    });
    const payload = {
      enableAntiCsrf: false,
      userId: superTokensUserId,
      userDataInDatabase: sessionData,
      userDataInJWT: sessionData,
    };

    const response = await fetch(
      `${ensureEnv('SUPERTOKENS_CONNECTION_URI')}/appid-public/public/recipe/session`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'api-key': ensureEnv('SUPERTOKENS_API_KEY'),
          rid: 'session',
          'cdi-version': '4.0',
        },
        body: JSON.stringify(payload),
      },
    );
    const body = await response.text();

    if (response.status !== 200) {
      throw new Error(`Create session failed. ${response.status}.\n ${body}`);
    }

    const data = CreateSessionModel.parse(JSON.parse(body));

    /**
     * These are the required cookies that need to be set.
     */
    return {
      access_token: data.accessToken.token,
      refresh_token: data.refreshToken.token,
    };
  } catch (e) {
    console.warn(`Failed to create session:`, e);
    throw e;
  }
};

const password = 'ilikebigturtlesandicannotlie47';
const hashedPassword = await hashPassword(password);

export function userEmail(userId: string) {
  return `${userId}-${Date.now()}@localhost.localhost`;
}

const tokenResponsePromise: {
  [key: string]: Promise<{
    userId: string;
    email: string;
  }> | null;
} = {};

export async function authenticate(
  pool: DatabasePool,
  email: string,
  oidcIntegrationId?: string,
): Promise<{ access_token: string; refresh_token: string }> {
  if (process.env.SUPERTOKENS_AT_HOME === '1') {
    const supertokensStore = new SuperTokensStore(pool, new NoopLogger());
    if (!tokenResponsePromise[email]) {
      tokenResponsePromise[email] = supertokensStore.createEmailPasswordUser({
        email,
        passwordHash: hashedPassword,
      });
    }

    const user = await tokenResponsePromise[email]!;

    return await createSessionAtHome(
      supertokensStore,
      user.userId,
      email,
      oidcIntegrationId ?? null,
    );
  }

  if (!tokenResponsePromise[email]) {
    tokenResponsePromise[email] = signUpUserViaEmail(email, password).then(res => ({
      email: res.user.email,
      userId: res.user.id,
    }));
  }

  return tokenResponsePromise[email]!.then(data =>
    createSession(data.userId, data.email, oidcIntegrationId ?? null),
  );
}
