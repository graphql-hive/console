import { type MigrationExecutor } from '../pg-migrator';

/**
 * This migration establishes the tables for email verifications.
 */
export default {
  name: '2026.01.09T00-00-00.email-verifications.ts',
  run: ({ sql }) => sql`
    DO $$
    BEGIN
      CREATE TABLE IF NOT EXISTS "email_verifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4()
        , "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
        , "provider" text NOT NULL
        , "email" text NOT NULL
        , "token" text
        , "created_at" timestamptz NOT NULL DEFAULT now()
        , "expires_at" timestamptz
        , "verified_at" timestamptz
        , UNIQUE ("user_id", "provider", "email")
      );

      IF (SELECT to_regclass('supertokens_emailverification_verified_emails') IS NOT null)
      THEN
        INSERT INTO "email_verifications" ("user_id", "provider", "email", "verified_at")
        SELECT
          "u"."id" "user_id"
          , CASE WHEN "stu"."third_party_id" = 'google' THEN 'GOOGLE'
              ELSE CASE WHEN "stu"."third_party_id" = 'github' THEN 'GITHUB'
                ELSE CASE WHEN "stu"."third_party_id" = 'oidc' THEN 'OIDC'
                  ELSE 'EMAILPASSWORD'
                END
              END
            END "provider"
          , "u"."email" "email"
          , now() "verified_at"
        FROM "users" "u"
        INNER JOIN "supertokens_emailverification_verified_emails" "seve"
        ON "u"."email" = "seve"."email"
        LEFT JOIN "supertokens_emailpassword_users" "seu"
        ON "seu"."user_id" = "seve"."user_id"
        LEFT JOIN "supertokens_thirdparty_users" "stu"
        ON "stu"."user_id" = "seve"."user_id" AND "stu"."third_party_id" != 'oidc'
        WHERE "seu"."email" IS NOT NULL OR "stu"."email" IS NOT NULL;
      END IF;
    END $$;
  `,
} satisfies MigrationExecutor;
