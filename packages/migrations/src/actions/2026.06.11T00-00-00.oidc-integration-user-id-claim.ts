import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.06.11T00-00-00.oidc-integration-user-id-claim.ts',
  run: ({ psql }) => [
    {
      name: 'add column "oidc_integrations"."user_id_claim"',
      query: psql`
        ALTER TABLE "oidc_integrations"
          ADD COLUMN IF NOT EXISTS "user_id_claim" text DEFAULT 'sub'
          , ADD COLUMN IF NOT EXISTS "user_provisioning_required" boolean DEFAULT TRUE
          , ADD COLUMN IF NOT EXISTS "oidc_for_verified_domains_required" boolean DEFAULT FALSE
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
