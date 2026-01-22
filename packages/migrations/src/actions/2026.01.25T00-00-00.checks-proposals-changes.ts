import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.25T00-00-00.checks-proposals-changes.ts',
  run: ({ sql }) => [
    {
      name: 'add schema proposal changes to schema_checks table',
      query: sql`
        ALTER TABLE IF EXISTS "schema_checks"
          ADD COLUMN IF NOT EXISTS "schema_proposal_changes" jsonb
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
