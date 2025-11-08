import { type MigrationExecutor } from '../pg-migrator';

/**
 * Initializes DB for Better Auth and migrates SuperTokens auth data to it
 */
export default {
  name: '2025.10.24T00-00-00.better-auth.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: 'Setup better-auth tables',
      query: sql`
        CREATE TABLE IF NOT EXISTS "better_auth_users" (
          "id" text NOT NULL PRIMARY KEY
          , "name" text NOT NULL
          , "email" text NOT NULL UNIQUE
          , "emailVerified" boolean NOT NULL DEFAULT FALSE
          , "image" text
          , "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
          , "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "better_auth_sessions" (
          "id" text NOT NULL PRIMARY KEY
          , "expiresAt" timestamptz NOT NULL
          , "token" text NOT NULL UNIQUE
          , "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
          , "updatedAt" timestamptz NOT NULL
          , "ipAddress" text
          , "userAgent" text
          , "userId" text NOT NULL REFERENCES "better_auth_users" ("id") ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "better_auth_accounts" (
          "id" text NOT NULL PRIMARY KEY
          , "accountId" text NOT NULL
          , "providerId" text NOT NULL
          , "userId" text NOT NULL REFERENCES "better_auth_users" ("id") ON DELETE CASCADE
          , "accessToken" text
          , "refreshToken" text
          , "idToken" text
          , "accessTokenExpiresAt" timestamptz
          , "refreshTokenExpiresAt" timestamptz
          , "scope" text
          , "password" text
          , "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
          , "updatedAt" timestamptz NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "better_auth_verifications" (
          "id" text NOT NULL PRIMARY KEY
          , "identifier" text NOT NULL
          , "value" text NOT NULL
          , "expiresAt" timestamptz NOT NULL
          , "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
          , "updatedAt" timestamptz NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "better_auth_sso_providers" (
          "id" text NOT NULL PRIMARY KEY
          , "issuer" text NOT NULL
          , "oidcConfig" text
          , "samlConfig" text
          , "userId" text NOT NULL REFERENCES "better_auth_users" ("id") ON DELETE CASCADE
          , "providerId" text NOT NULL UNIQUE
          , "organizationId" text
          , "domain" text NOT NULL
        );
      `,
    },
    {
      name: 'Migrate emailpassword users and accounts',
      query: sql`
        INSERT INTO "better_auth_users"
          ("id", "name", "email", "createdAt")
        SELECT
          "sepu"."user_id" AS "id",
          "u"."full_name" AS "name",
          "sepu"."email" AS "email",
          TO_TIMESTAMP("sepu"."time_joined" / 1000.0) AS "createdAt"
        FROM "supertokens_emailpassword_users" "sepu"
        INNER JOIN "users" "u"
        ON "sepu"."user_id" = "u"."supertoken_user_id"
        ON CONFLICT DO NOTHING;

        INSERT INTO "better_auth_accounts"
          ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
        SELECT
          REPLACE(uuid_generate_v4()::text, '-', '') AS "id",
          "sepu"."user_id" AS "accountId",
          'credential' AS "providerId",
          "sepu"."user_id" AS "userId",
          "sepu"."password_hash" AS "password",
          TO_TIMESTAMP("sepu"."time_joined" / 1000.0) AS "createdAt",
          CURRENT_TIMESTAMP AS "updatedAt"
        FROM "supertokens_emailpassword_users" "sepu"
        INNER JOIN "users" "u"
        ON "sepu"."user_id" = "u"."supertoken_user_id";
      `,
    },
		{
			name: "Migrate thirdparty users and accounts",
			query: sql`
				INSERT INTO "better_auth_users"
					("id", "name", "email", "createdAt")
				SELECT
					"stpu"."user_id" AS "id",
					"u"."full_name" AS "name",
					"stpu"."email" AS "email",
					TO_TIMESTAMP("stpu"."time_joined" / 1000.0) AS "createdAt"
				FROM "supertokens_thirdparty_users" "stpu"
				INNER JOIN "users" "u"
				ON "stpu"."user_id" = "u"."supertoken_user_id";

				INSERT INTO "better_auth_accounts"
					("id", "accountId", "providerId", "userId", "createdAt", "updatedAt")
				SELECT
					REPLACE(uuid_generate_v4()::text, '-', '') AS "id",
					"stpu"."third_party_user_id" AS "accountId",
					"stpu"."third_party_id" AS "providerId",
					"stpu"."user_id" AS "userId",
					TO_TIMESTAMP("supertokens_thirdparty_users"."time_joined" / 1000.0) AS "createdAt",
					CURRENT_TIMESTAMP AS "updatedAt"
				FROM "supertokens_thirdparty_users" "stpu"
				INNER JOIN "users" "u"
				ON "stpu"."user_id" = "u"."supertoken_user_id";
			`,
		},
    {
      name: 'Migrate email verifications',
      query: sql`
        UPDATE "better_auth_users" "bau"
        SET "emailVerified" = TRUE
        WHERE "bau"."email" IN (
          SELECT "email" FROM "supertokens_emailverification_verified_emails"
        );
      `,
    },
  ],
} satisfies MigrationExecutor;
