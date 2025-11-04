import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.10.17T00-00-00.organization-access-tokens-project-scope.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: 'add new columns to "organization_access_tokens"',
      query: sql`
        ALTER TABLE "organization_access_tokens"
          ADD COLUMN IF NOT EXISTS "project_id" UUID REFERENCES "projects" ("id") ON DELETE CASCADE
          , ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES "users" ("id") ON DELETE CASCADE
          , ALTER COLUMN "permissions" DROP NOT NULL;
      `,
    },
    {
      name: 'add index "organization_access_tokens_pagination_target"',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_access_tokens_pagination_project" ON "organization_access_tokens" (
          "project_id"
          , "created_at" DESC
          , "id" DESC
        )
      `,
    },
    {
      name: 'add index "organization_access_tokens_pagination_user"',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_access_tokens_pagination_user" ON "organization_access_tokens" (
          "user_id"
          , "created_at" DESC
          , "id" DESC
        )
      `,
    },
  ],
} satisfies MigrationExecutor;
