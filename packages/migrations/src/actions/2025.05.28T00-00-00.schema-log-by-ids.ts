import { type MigrationExecutor } from '../pg-migrator';

/**
 * Adds an index specifically for getSchemaVersionByActionId.
 */
export default {
  name: '2025.05.28T00-00-00.schema-log-by-ids.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: 'index schema_log_by_ids',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_log_by_ids" ON "schema_log"(
          "project_id"
          , "target_id"
          , "commit"
          )
      `,
    },
  ],
} satisfies MigrationExecutor;
