import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.21T00-00-00.app-deployment-protection.ts',
  run: ({ sql }) => sql`
    ALTER TABLE targets
      ADD COLUMN IF NOT EXISTS app_deployment_protection_enabled BOOLEAN NOT NULL DEFAULT FALSE
      , ADD COLUMN IF NOT EXISTS app_deployment_protection_min_days_inactive INT NOT NULL DEFAULT 7
      , ADD COLUMN IF NOT EXISTS app_deployment_protection_max_traffic_percentage NUMERIC(5,2) NOT NULL DEFAULT 1.00
      , ADD COLUMN IF NOT EXISTS app_deployment_protection_traffic_period_days INT NOT NULL DEFAULT 30
      , ADD COLUMN IF NOT EXISTS app_deployment_protection_rule_logic TEXT NOT NULL DEFAULT 'AND'
    ;
`,
} satisfies MigrationExecutor;
