import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.12.24T00-00-00.improve-version-index-2.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: `create "schema_version_changes"."schema_version_id" lookup index`,
      query: sql`CREATE INDEX CONCURRENTLY idx_schema_version_changes_id ON schema_version_changes(schema_version_id);`,
    },
  ],
} satisfies MigrationExecutor;
