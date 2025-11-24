import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.11.25T00-00-00.members-search.ts',
  run: ({ sql }) => sql`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_search_by_email_and_display_name" on users using gin(LOWER(email|| ' ' || display_name) gin_trgm_ops);
  `,
} satisfies MigrationExecutor;
