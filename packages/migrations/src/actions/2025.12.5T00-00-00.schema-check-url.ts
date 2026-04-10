import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.12.5T00-00-00.schema-check-url.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "schema_checks"
      ADD COLUMN IF NOT EXISTS "service_url" TEXT
    ;
  `,
} satisfies MigrationExecutor;
