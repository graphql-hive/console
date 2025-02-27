import type { MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.02.21T00.00.00.schema-versions-metadata-attributes.ts',
  run: ({ sql }) => sql`
    ALTER TABLE "schema_versions"
      ADD COLUMN "metadata_attributes" JSONB DEFAULT NULL
    ;
  `,
} satisfies MigrationExecutor;
