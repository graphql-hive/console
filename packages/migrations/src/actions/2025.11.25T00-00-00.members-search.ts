import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.11.25T00-00-00.members-search.ts',
  run: ({ sql }) => sql`
    -- The order was wrong. This was sorting by org_id, user_id, then created_at...
    DROP INDEX IF EXISTS "organization_member_pagination_idx";

    -- Replace "organization_member_pagination_idx" with a new index in the correct order
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_member_pagination"
    ON "organization_member" (
      "organization_id" DESC
      , "created_at" DESC
      , "user_id" DESC
    );
  `,
} satisfies MigrationExecutor;
