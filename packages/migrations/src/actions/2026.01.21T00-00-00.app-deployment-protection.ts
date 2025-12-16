import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.21T00-00-00.app-deployment-protection.ts',
  run: ({ sql }) => sql`
    ALTER TABLE targets ADD COLUMN app_deployment_protection_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE targets ADD COLUMN app_deployment_protection_min_days_inactive INT NOT NULL DEFAULT 30;
    ALTER TABLE targets ADD COLUMN app_deployment_protection_max_traffic_percentage NUMERIC(5,2) NOT NULL DEFAULT 1.00;
`,
} satisfies MigrationExecutor;
