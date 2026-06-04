import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.05.29T00-00-00.schema-log-target-id-nullability.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "schema_log"
      ALTER COLUMN "target_id" DROP NOT NULL
      , DROP CONSTRAINT "commits_target_id_fkey"
    ;
  `,
} satisfies MigrationExecutor;
