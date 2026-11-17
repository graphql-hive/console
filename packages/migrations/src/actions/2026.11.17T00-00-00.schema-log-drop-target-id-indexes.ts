import { type MigrationExecutor } from '../pg-migrator';

/**
 * "schema_log"."target_id" is no longer read or written (see 2026.05.29T00-00-00.schema-log-target-id-nullability.ts).
 * Replace the commit lookup index with one that does not contain "target_id" and drop the
 * cascade-deletion index on "target_id", in preparation for dropping the column.
 */
export default {
  name: '2026.11.17T00-00-00.schema-log-drop-target-id-indexes.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'create index schema_log_by_project_commit_ordered',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_log_by_project_commit_ordered" ON "schema_log"(
          "project_id"
          , "commit"
          , "created_at" DESC
        )
      `,
    },
    {
      name: 'drop index schema_log_by_commit_ordered',
      query: psql`
        DROP INDEX CONCURRENTLY IF EXISTS "schema_log_by_commit_ordered"
      `,
    },
    {
      name: 'drop index schema_log_target_id',
      query: psql`
        DROP INDEX CONCURRENTLY IF EXISTS "schema_log_target_id"
      `,
    },
  ],
} satisfies MigrationExecutor;
