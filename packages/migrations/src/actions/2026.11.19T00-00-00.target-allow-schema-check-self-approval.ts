import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.11.19T00-00-00.target-allow-schema-check-self-approval.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "targets"
      ADD COLUMN IF NOT EXISTS "allow_schema_check_self_approval" BOOLEAN NOT NULL DEFAULT FALSE
    ;
  `,
} satisfies MigrationExecutor;
