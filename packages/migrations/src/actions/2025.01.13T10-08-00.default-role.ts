import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.01.13T10-08-00.default-role.ts',
  // Adds a default role to OIDC integration
  run: ({ sql }) => sql`
    ALTER TABLE "oidc_integrations"
    ADD COLUMN "default_role_id" UUID REFERENCES organization_member_roles(id)
    ON DELETE SET NULL;
  `,
} satisfies MigrationExecutor;
