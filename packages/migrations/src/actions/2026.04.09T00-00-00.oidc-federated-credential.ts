import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.04.09T00-00-00.oidc-federated-credential.sql',
  run: ({ psql }) => psql`
    ALTER TABLE "oidc_integrations"
      ADD COLUMN IF NOT EXISTS "use_federated_credential" BOOLEAN NOT NULL DEFAULT FALSE,
      ALTER COLUMN "client_secret" DROP NOT NULL;
  `,
} satisfies MigrationExecutor;
