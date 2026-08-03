import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.06.25T00-00-00.failing-dangerous-change-types.ts',
  run: ({ psql }) => [
    {
      name: 'add failing dangerous change columns',
      query: psql`
        ALTER TABLE IF EXISTS "targets"
          ADD COLUMN IF NOT EXISTS fail_all_dangerous_changes BOOLEAN NOT NULL DEFAULT TRUE
          , ADD COLUMN IF NOT EXISTS fail_dangerous_change_types TEXT[] NOT NULL DEFAULT '{}'
      `,
    },
  ],
} satisfies MigrationExecutor;
