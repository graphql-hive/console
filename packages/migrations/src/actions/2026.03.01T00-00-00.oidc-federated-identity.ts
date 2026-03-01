import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.03.01T00-00-00.oidc-federated-identity.ts',
  run: ({ sql }) => [
    {
      name: 'add `use_federated_identity` column to `oidc_integrations` table',
      query: sql`
        ALTER TABLE IF EXISTS "oidc_integrations"
          ADD COLUMN IF NOT EXISTS "use_federated_identity" boolean NOT NULL DEFAULT false
        ;
      `,
    },
    {
      name: 'make `client_secret` column nullable in `oidc_integrations` table',
      query: sql`
        ALTER TABLE IF EXISTS "oidc_integrations"
          ALTER COLUMN "client_secret" DROP NOT NULL
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
