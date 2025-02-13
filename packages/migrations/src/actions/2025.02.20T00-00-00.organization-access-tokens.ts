import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.02.20T00-00-00.organization-access-tokens.ts',
  run: ({ sql }) => sql`
    CREATE TABLE IF NOT EXISTS "organization_access_tokens" (
      "id" UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4()
      , "organization_id" UUID NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE
      , "created_at" timestamptz NOT NULL DEFAULT now()
      , "title" text NOT NULL
      , "description" text
      , "permissions" text[] NOT NULL
      , "assigned_resources" jsonb
      , "hash" text
      , "first_characters" text
    );

    CREATE INDEX IF NOT EXISTS "organization_access_tokens_organization_id" ON "organization_access_tokens" (
      "organization_id"
      , "created_at" DESC
      , "id" DESC
    );
  `,
} satisfies MigrationExecutor;
