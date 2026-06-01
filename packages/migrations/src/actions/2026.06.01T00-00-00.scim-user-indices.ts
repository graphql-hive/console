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
  ],
} satisfies MigrationExecutor;
