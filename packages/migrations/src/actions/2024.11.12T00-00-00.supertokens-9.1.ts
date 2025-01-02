import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.11.12T00-00-00.supertokens-9.1.ts',
  run: ({ sql }) => sql`
    ALTER TABLE IF EXISTS "supertokens_tenant_configs"
      ADD COLUMN IF NOT EXISTS "is_first_factors_null" BOOLEAN DEFAULT TRUE;
    ALTER TABLE IF EXISTS "supertokens_tenant_configs"
      ALTER COLUMN "is_first_factors_null" DROP DEFAULT;
  `,
} satisfies MigrationExecutor;
