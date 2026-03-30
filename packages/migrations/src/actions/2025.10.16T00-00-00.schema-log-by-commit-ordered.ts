import { type MigrationExecutor } from '../pg-migrator';

/**
 * Adds an index specifically for getSchemaVersionByActionId.
 */
export default {
  name: '2025.10.16T00-00-00.schema-log-by-commit-ordered.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'index schema_log_by_commit_ordered',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_log_by_commit_ordered" ON "schema_log"(
          "project_id"
          , "target_id"
          , "commit"
          , "created_at" DESC
          )
      `,
    },
    {
      name: 'drop index schema_log_by_ids',
      query: psql`
        DROP INDEX CONCURRENTLY IF EXISTS "schema_log_by_ids";
      `,
    },
  ],
} satisfies MigrationExecutor;
