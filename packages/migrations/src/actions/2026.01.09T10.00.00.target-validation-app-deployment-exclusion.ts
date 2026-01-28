import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.09T10.00.00.target-validation-app-deployment-exclusion.sql',
  run: ({ sql }) => sql`
ALTER TABLE
  targets
ADD COLUMN
  validation_excluded_app_deployments TEXT[];
`,
} satisfies MigrationExecutor;
