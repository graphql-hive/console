import {
  AccessTokenKeyContainer,
  hashPassword,
} from '@hive/api/modules/auth/lib/supertokens-at-home/crypto';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';
import { NoopLogger } from '@hive/api/modules/shared/providers/logger';
import { PostgresDatabasePool } from '@hive/postgres';
import { createNewSession } from '@hive/server/supertokens-at-home/shared';
import { createStorage } from '@hive/storage';
import { ensureEnv } from './env';

let storagePromise: ReturnType<typeof createStorage> | null = null;

function getStorage() {
  if (!storagePromise) {
    const pg = {
      user: ensureEnv('POSTGRES_USER'),
      password: ensureEnv('POSTGRES_PASSWORD'),
      host: ensureEnv('POSTGRES_HOST'),
      port: ensureEnv('POSTGRES_PORT'),
      db: ensureEnv('POSTGRES_DB'),
    };
    storagePromise = createStorage(
      `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.db}?sslmode=disable`,
      1,
    );
  }
  return storagePromise;
}

/**
 * Ensures the Hive user record for a SuperTokens user exists,
 * the same way the auth endpoints of the server do on sign in.
 */
export async function ensureHiveUser(args: {
  superTokensUserId: string;
  email: string;
  oidcIntegrationId: string | null;
}) {
  const storage = await getStorage();
  const result = await storage.ensureUserExists({
    superTokensUserId: args.superTokensUserId,
    email: args.email,
    oidcIntegration: args.oidcIntegrationId ? { id: args.oidcIntegrationId } : null,
    firstName: null,
    lastName: null,
  });
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.user;
}

const createSessionAtHome = async (
  supertokensStore: SuperTokensStore,
  superTokensUserId: string,
  email: string,
  oidcIntegrationId: string | null,
) => {
  const hiveUser = await ensureHiveUser({ superTokensUserId, email, oidcIntegrationId });

  const session = await createNewSession(
    supertokensStore,
    {
      superTokensUserId,
      hiveUser,
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

/**
 * The password set on every user created by `authenticate`. Exported so
 * seed scripts can print it to operators alongside the email they should
 * sign in with.
 */
export const password = 'ilikebigturtlesandicannotlie47';
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
