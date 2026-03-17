import type { MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.03.20T00-00-00.dangerous_breaking.ts',
  noTransaction: true,
  run: ({ sql }) => sql`
    ALTER TABLE
      targets
    ADD COLUMN
      fail_diff_on_dangerous_change BOOLEAN NOT NULL DEFAULT FALSE;
  `,
} satisfies MigrationExecutor;
