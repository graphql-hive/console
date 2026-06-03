/**
 * Shared seed-script auth helper.
 *
 * `getOrCreateAuth` lets a seed/demo script accept either a brand-new email
 * (registers a fresh user) or an existing developer's email (creates a
 * session for them directly, no signup). The latter is useful when you want
 * the seeded org's owner to be a user you're already signed in as in the
 * browser, so you don't have to swap accounts to view the demo data.
 *
 * Used by `scripts/seed-insights-and-alerts/seed-insights-and-alerts.mts`
 * and `scripts/seed-alerts-live/seed-alerts-live.mts`. Both expect the
 * caller to have already set `RUN_AGAINST_LOCAL_SERVICES=1` and imported
 * `integration-tests/local-dev.ts` so the testkit + Postgres env vars are
 * populated.
 */

const { createPostgresDatabasePool, psql } = await import('@hive/postgres');
const { authenticate, password: DEV_USER_PASSWORD } = await import(
  '../../integration-tests/testkit/auth'
);
const { ensureEnv } = await import('../../integration-tests/testkit/env');

/**
 * Re-exported from the testkit (the canonical source — it's what
 * `authenticate` hashes when it registers a user). Seed scripts print this
 * alongside the dev-owner email so the operator knows what to type into the
 * sign-in form.
 */
export { DEV_USER_PASSWORD };

export function getSeedPGConnectionString(): string {
  const pg = {
    user: ensureEnv('POSTGRES_USER'),
    password: ensureEnv('POSTGRES_PASSWORD'),
    host: ensureEnv('POSTGRES_HOST'),
    port: ensureEnv('POSTGRES_PORT'),
    db: ensureEnv('POSTGRES_DB'),
  };
  return `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.db}?sslmode=disable`;
}

export async function getOrCreateAuth(
  email: string,
): Promise<{ access_token: string; refresh_token: string; isExistingUser: boolean }> {
  const pool = await createPostgresDatabasePool({
    connectionParameters: getSeedPGConnectionString(),
  });
  try {
    const existingUserId = await pool.maybeOneFirst(psql`
      SELECT "user_id" FROM "supertokens_emailpassword_users"
      WHERE "app_id" = 'public' AND "email" = lower(${email})
    `);

    if (existingUserId) {
      // Existing user — create a session directly without re-running signup.
      // Reaches into @hive/api + @hive/server internals because there's no
      // public mutation for "give me a session for an existing user"; that
      // operation is normally owned by the auth-token-refresh flow.
      console.log(`   Found existing user: ${email}`);
      const { SuperTokensStore } = await import(
        '@hive/api/modules/auth/providers/supertokens-store'
      );
      const { NoopLogger } = await import('@hive/api/modules/shared/providers/logger');
      const { AccessTokenKeyContainer } = await import(
        '@hive/api/modules/auth/lib/supertokens-at-home/crypto'
      );
      const { createNewSession } = await import('@hive/server/supertokens-at-home/shared');
      const { createTRPCProxyClient, httpLink } = await import('@trpc/client');
      const { getServiceHost } = await import('../../integration-tests/testkit/utils');
      const graphqlAddress = await getServiceHost('server', 8082);

      type InternalApi = import('@hive/server').InternalApi;
      const internalApi = createTRPCProxyClient<InternalApi>({
        links: [httpLink({ url: `http://${graphqlAddress}/trpc`, fetch })],
      });

      const ensureUserResult = await internalApi.ensureUser.mutate({
        superTokensUserId: existingUserId as string,
        email,
        oidcIntegrationId: null,
        firstName: null,
        lastName: null,
      });
      if (!ensureUserResult.ok) {
        throw new Error(`ensureUser failed: ${ensureUserResult.reason}`);
      }

      const supertokensStore = new SuperTokensStore(pool, new NoopLogger());
      const session = await createNewSession(
        supertokensStore,
        {
          superTokensUserId: existingUserId as string,
          hiveUser: ensureUserResult.user,
          oidcIntegrationId: null,
        },
        {
          refreshTokenKey: process.env.SUPERTOKENS_REFRESH_TOKEN_KEY!,
          accessTokenKey: new AccessTokenKeyContainer(process.env.SUPERTOKENS_ACCESS_TOKEN_KEY!),
        },
      );

      return {
        access_token: session.accessToken.token,
        refresh_token: session.refreshToken,
        isExistingUser: true,
      };
    }

    // New user — testkit's `authenticate` registers + signs in.
    const auth = await authenticate(pool, email);
    return {
      access_token: auth.access_token,
      refresh_token: auth.refresh_token,
      isExistingUser: false,
    };
  } finally {
    await pool.end();
  }
}
