import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.09.18T00-00-01.graph-schema-version-indexes.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'create schema_versions_graph_pagination index',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_graph_pagination"
        ON "schema_versions" (
          "graph_id" ASC,
          "created_at" DESC,
          "id" DESC
        )
        WHERE "graph_id" IS NOT NULL
      `,
    },
    {
      name: 'create schema_versions_source_schema_version_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_source_schema_version_id"
        ON "schema_versions" ("source_schema_version_id")
        WHERE "source_schema_version_id" IS NOT NULL
      `,
    },
    {
      name: 'create schema_versions_graph_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_graph_id"
        ON "schema_versions" ("graph_id")
        WHERE "graph_id" IS NOT NULL
      `,
    },
  ],
} satisfies MigrationExecutor;
