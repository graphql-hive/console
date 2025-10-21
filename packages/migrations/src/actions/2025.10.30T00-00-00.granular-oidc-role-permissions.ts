import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.10.30T00-00-00.granular-oidc-role-permissions.ts',
  run: ({ sql }) => sql`
    ALTER TABLE "oidc_integrations"
      ADD COLUMN "default_assigned_resources" JSONB
    ;
  `,
} satisfies MigrationExecutor;
