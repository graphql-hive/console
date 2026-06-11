import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.06.11T00-00-00.oidc-integration-user-id-claim.ts',
  run: ({ psql }) => [
    {
      name: 'add column "oidc_integrations"."user_id_claim"',
      query: psql`
        ALTER TABLE "oidc_integrations"
          ADD COLUMN IF NOT EXISTS "user_id_claim" text NULL
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
