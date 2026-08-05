import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.05.18T00-00-00.scim-user-group-provisioning.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'provisioned_by_organization_id index',
      query: psql`
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_provisioned_by_organization_id_external_id"
        ON "users" ("provisioned_by_organization_id", "external_id")
        WHERE
          "provisioned_by_organization_id" IS NOT NULL
          AND "external_id" IS NOT NULL
        ;
      `,
    },
    {
      name: 'provisioned_by_organization_id index',
      query: psql`
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_provisioned_by_organization_id_display_name"
        ON "users" ("provisioned_by_organization_id", lower("display_name"))
        WHERE
          "provisioned_by_organization_id" IS NOT NULL
        ;
      `,
    },
    {
      name: 'idx_supertokens_session_info_user_id',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_supertokens_session_info_user_id"
        ON "supertokens_session_info" ("user_id")
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
