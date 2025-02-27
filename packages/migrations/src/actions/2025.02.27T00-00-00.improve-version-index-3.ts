import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.02.12T00-00-00.improve-version-index-3.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: `create "schema_versions"."target_id" with "created_at" sort index`,
      query: sql`CREATE INDEX CONCURRENTLY idx_maybe_latest_version_id ON schema_versions(target_id, created_at DESC);`,
    },
  ],
} satisfies MigrationExecutor;
