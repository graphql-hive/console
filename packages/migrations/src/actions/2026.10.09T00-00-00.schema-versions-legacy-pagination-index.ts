import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.10.09T00-00-00.schema-versions-legacy-pagination-index.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'create schema_versions_legacy_pagination index',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_legacy_pagination"
        ON "schema_versions" (
          "target_id" ASC,
          "created_at" DESC,
          "id" DESC
        )
        WHERE "graph_metadata" IS NULL
      `,
    },
  ],
} satisfies MigrationExecutor;
