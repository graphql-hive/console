import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.04.14T00-00-00.app-deployment-format.ts',
  run: ({ sql }) => sql`
    ALTER TABLE app_deployments
      ADD COLUMN IF NOT EXISTS "format" TEXT CHECK ("format" IN ('custom', 'sha256'))
    ;
`,
} satisfies MigrationExecutor;
