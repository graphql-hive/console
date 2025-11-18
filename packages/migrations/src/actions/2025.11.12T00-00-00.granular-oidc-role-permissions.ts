import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.11.12T00-00-00.granular-oidc-role-permissions.ts',
  run: ({ sql }) => sql`
    ALTER TABLE "oidc_integrations"
      ADD COLUMN IF NOT EXISTS "default_assigned_resources" JSONB
    ;

    ALTER TABLE "organization_invitations"
      ADD COLUMN IF NOT EXISTS "assigned_resources" JSONB
    ;
  `,
} satisfies MigrationExecutor;
