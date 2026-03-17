import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.12.17T00-00-00.custom-oidc-scopes.ts',
  run: ({ sql }) => [
    {
      name: 'Create new "additional_scopes" column',
      query: sql`
        -- Alter the "oidc_integrations" table with the new column "additional_scopes"
        ALTER TABLE "oidc_integrations"
        ADD COLUMN "additional_scopes" TEXT[];
      `,
    },
  ],
} satisfies MigrationExecutor;
