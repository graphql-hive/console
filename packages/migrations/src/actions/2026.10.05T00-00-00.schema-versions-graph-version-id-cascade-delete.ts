import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.10.05T00-00-00.schema-versions-graph-version-id-cascade-delete.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'create "schema_versions_graph_id_fkey_new" constraint',
      query: psql`
        ALTER TABLE "schema_versions"
          ADD CONSTRAINT "schema_versions_graph_id_fkey_new"
            FOREIGN KEY ("graph_id")
            REFERENCES "graphs" ("id")
            ON DELETE CASCADE
            NOT VALID
      `,
    },
    {
      name: 'drop "schema_versions_graph_id_fkey" constraint',
      query: psql`
        ALTER TABLE "schema_versions"
          DROP CONSTRAINT IF EXISTS "schema_versions_graph_id_fkey"
      `,
    },
    {
      name: 'rename "schema_versions_graph_id_fkey_new" to "schema_versions_graph_id_fkey"',
      query: psql`
        ALTER TABLE "schema_versions"
          RENAME CONSTRAINT "schema_versions_graph_id_fkey_new"
            TO "schema_versions_graph_id_fkey"
      `,
    },
  ],
} satisfies MigrationExecutor;
