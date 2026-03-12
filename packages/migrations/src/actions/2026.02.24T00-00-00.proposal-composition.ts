import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.02.24T00-00-00.proposal-composition.ts',
  run: ({ sql }) => [
    {
      name: 'add schema proposal composition state',
      query: sql`
        ALTER TABLE IF EXISTS "schema_proposals"
            ADD COLUMN IF NOT EXISTS "composition_status" TEXT
          , ADD COLUMN IF NOT EXISTS "composition_timestamp" TIMESTAMPTZ
          , ADD COLUMN IF NOT EXISTS "composition_status_reason" TEXT
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
