import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.12.17T00-00-00.oidc-scope.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: 'Create new "scope" column',
      query: sql`
        -- Alter the "oidc_integrations" table with the new column "scope"
        ALTER TABLE "oidc_integrations"
        ADD COLUMN "scope" TEXT[]
        DEFAULT array['openid', 'email'];
      `,
    },
  ],
} satisfies MigrationExecutor;
