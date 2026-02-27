import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.02.25T00-00-00.oidc-integration-domains.ts',
  run: ({ sql }) => sql`
    CREATE TABLE IF NOT EXISTS "oidc_integration_domains" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4()
      , "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE
      , "oidc_integration_id" uuid NOT NULL REFERENCES "oidc_integrations"("id") ON DELETE CASCADE
      , "domain_name" text NOT NULL
      , "created_at" timestamptz NOT NULL DEFAULT NOW()
      , "verified_at" timestamptz DEFAULT NULL
      , PRIMARY KEY ("id")
      , UNIQUE ("oidc_integration_id", "domain_name")
    );

    CREATE INDEX "oidc_integration_domains_oidc_integration_id_idx"
      ON "oidc_integration_domains" ("oidc_integration_id")
    ;
    CREATE INDEX "oidc_integration_domains_organization_id_idx"
      ON "oidc_integration_domains" ("organization_id")
    ;
    CREATE INDEX "oidc_integration_domains_domain_name_idx"
      ON "oidc_integration_domains" ("domain_name")
    ;
    CREATE UNIQUE INDEX "only_one_verified_domain_name_idx"
      ON "oidc_integration_domains" ("domain_name")
    WHERE "verified_at" IS NOT NULL;
  `,
} satisfies MigrationExecutor;
