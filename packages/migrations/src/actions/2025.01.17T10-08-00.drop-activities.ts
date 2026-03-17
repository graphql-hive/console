import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.01.17T10-08-00.drop-activities.ts',
  run: ({ sql }) => sql`
    DROP TABLE IF EXISTS "activities";
`,
} satisfies MigrationExecutor;
