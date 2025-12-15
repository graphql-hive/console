import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.12.15T00-00-00.access-token-created-by.ts',
  run: ({ sql }) => sql`
    ALTER TABLE "organization_access_tokens"
      ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID REFERENCES "users" ("id") ON DELETE SET NULL;
  `,
} satisfies MigrationExecutor;
