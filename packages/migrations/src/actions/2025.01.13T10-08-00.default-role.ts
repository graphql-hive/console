import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.01.13T10-08-00.default-role.ts',
  // Adds a default role to OIDC integration and set index on "oidc_integrations"."default_role_id"
  run: ({ sql }) => [
    {
      name: 'Add a column',
      query: sql`
      ALTER TABLE "oidc_integrations"
      ADD COLUMN IF NOT EXISTS "default_role_id" UUID REFERENCES organization_member_roles(id)
      ON DELETE SET NULL;
    `,
    },
    {
      name: 'Create an index',
      query: sql`
        CREATE INDEX IF NOT EXISTS "oidc_integrations_default_role_id_idx"
        ON "oidc_integrations"("default_role_id")
        WHERE "default_role_id" is not null;
      `,
    },
  ],
} satisfies MigrationExecutor;
