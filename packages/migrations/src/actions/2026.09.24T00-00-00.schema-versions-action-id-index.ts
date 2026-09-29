import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.09.24T00-00-00.schema-versions-action-id-index.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'create partial schema_versions_action_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_action_id_not_null"
          ON "schema_versions"("action_id")
          WHERE "action_id" IS NOT NULL
      `,
    },
    {
      name: 'drop old schema_versions_action_id index',
      query: psql`
        DROP INDEX CONCURRENTLY IF EXISTS "schema_versions_action_id"
      `,
    },
    {
      name: 'rename partial schema_versions_action_id index',
      query: psql`
        ALTER INDEX "schema_versions_action_id_not_null"
          RENAME TO "schema_versions_action_id"
      `,
    },
  ],
} satisfies MigrationExecutor;
