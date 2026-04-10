import {
  AccessTokenKeyContainer,
  hashPassword,
} from '@hive/api/modules/auth/lib/supertokens-at-home/crypto';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';
import { NoopLogger } from '@hive/api/modules/shared/providers/logger';
import { PostgresDatabasePool } from '@hive/postgres';
import type { InternalApi } from '@hive/server';
import { createNewSession } from '@hive/server/supertokens-at-home/shared';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { getServiceHost } from './utils';

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
    supertokensUserId: session.session.userId,
  };
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
  pool: PostgresDatabasePool,
  email: string,
  oidcIntegrationId?: string,
): Promise<{ access_token: string; refresh_token: string; supertokensUserId: string }> {
  const supertokensStore = new SuperTokensStore(pool, new NoopLogger());
  if (!tokenResponsePromise[email]) {
    tokenResponsePromise[email] = supertokensStore.createEmailPasswordUser({
      email,
      passwordHash: hashedPassword,
    });
  }

  const user = await tokenResponsePromise[email]!;
  return await createSessionAtHome(supertokensStore, user.userId, email, oidcIntegrationId ?? null);
}
