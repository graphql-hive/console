import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.09.24T00-00-01.schema-versions-action-id-nullability.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "schema_versions"
      ALTER COLUMN "action_id" DROP NOT NULL
    ;
  `,
} satisfies MigrationExecutor;
