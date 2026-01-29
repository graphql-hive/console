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
        , "user_identity_id" text NOT NULL UNIQUE
        , "token_hash" text
        , "created_at" timestamptz NOT NULL DEFAULT now()
        , "expires_at" timestamptz
        , "verified_at" timestamptz
      );

      IF (SELECT to_regclass('supertokens_emailverification_verified_emails') IS NOT null)
      THEN
        INSERT INTO "email_verifications" ("user_identity_id", "verified_at")
        SELECT
          "seve"."user_id" "user_identity_id"
          , now() "verified_at"
        FROM "supertokens_emailverification_verified_emails" "seve"
        INNER JOIN "supertokens_emailpassword_users" "seu"
        ON "seve"."user_id" = "seu"."user_id";
      END IF;
    END $$;
  `,
} satisfies MigrationExecutor;
