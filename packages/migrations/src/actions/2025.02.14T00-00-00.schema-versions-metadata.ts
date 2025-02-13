import type { MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.02.14T00.00.00.schema-versions-metadata.ts',
  run: ({ sql }) => sql`
    ALTER TABLE "schema_versions"
      ADD COLUMN "schema_metadata" JSONB DEFAULT NULL
    ;
  `,
} satisfies MigrationExecutor;
