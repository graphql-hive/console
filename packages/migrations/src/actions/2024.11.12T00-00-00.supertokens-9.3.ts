import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.11.12T00-00-00.supertokens-9.3.ts',
  run: ({ sql }) => sql`
    DO $$
    BEGIN
      IF (SELECT to_regclass('supertokens_apps') IS NOT null)
      THEN
        CREATE TABLE IF NOT EXISTS "supertokens_oauth_clients" (
          "app_id" VARCHAR(64),
          "client_id" VARCHAR(255) NOT NULL,
          "is_client_credentials_only" BOOLEAN NOT NULL,
          PRIMARY KEY ("app_id", "client_id"),
          FOREIGN KEY("app_id") REFERENCES "supertokens_apps"("app_id") ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "supertokens_oauth_sessions" (
          "gid" VARCHAR(255),
          "app_id" VARCHAR(64) DEFAULT 'public',
          "client_id" VARCHAR(255) NOT NULL,
          "session_handle" VARCHAR(128),
          "external_refresh_token" VARCHAR(255) UNIQUE,
          "internal_refresh_token" VARCHAR(255) UNIQUE,
          "jti" TEXT NOT NULL,
          "exp" BIGINT NOT NULL,
          PRIMARY KEY ("gid"),
          FOREIGN KEY("app_id", "client_id") REFERENCES "supertokens_oauth_clients"("app_id", "client_id") ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS "supertokens_oauth_session_exp_index"
          ON "supertokens_oauth_sessions"("exp" DESC);
        CREATE INDEX IF NOT EXISTS "supertokens_oauth_session_external_refresh_token_index"
          ON "supertokens_oauth_sessions"("app_id", "external_refresh_token" DESC);

        CREATE TABLE IF NOT EXISTS "supertokens_oauth_m2m_tokens" (
          "app_id" VARCHAR(64) DEFAULT 'public',
          "client_id" VARCHAR(255) NOT NULL,
          "iat" BIGINT NOT NULL,
          "exp" BIGINT NOT NULL,
          PRIMARY KEY ("app_id", "client_id", "iat"),
          FOREIGN KEY("app_id", "client_id") REFERENCES "supertokens_oauth_clients"("app_id", "client_id") ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS "supertokens_oauth_m2m_token_iat_index"
          ON "supertokens_oauth_m2m_tokens"("iat" DESC, "app_id" DESC);
        CREATE INDEX IF NOT EXISTS "supertokens_oauth_m2m_token_exp_index"
          ON "supertokens_oauth_m2m_tokens"("exp" DESC);

        CREATE TABLE IF NOT EXISTS "supertokens_oauth_logout_challenges" (
          "app_id" VARCHAR(64) DEFAULT 'public',
          "challenge" VARCHAR(128) NOT NULL,
          "client_id" VARCHAR(255) NOT NULL,
          "post_logout_redirect_uri" VARCHAR(1024),
          "session_handle" VARCHAR(128),
          "state" VARCHAR(128),
          "time_created" BIGINT NOT NULL,
          PRIMARY KEY ("app_id", "challenge"),
          FOREIGN KEY("app_id", "client_id") REFERENCES "supertokens_oauth_clients"("app_id", "client_id") ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS "oauth_logout_challenges_time_created_index"
          ON "supertokens_oauth_logout_challenges"("time_created" DESC);
      END IF;
    END $$;
  `,
} satisfies MigrationExecutor;
