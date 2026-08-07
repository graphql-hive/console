import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.08.07T00-00-00.scim-pending-takeover-index.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'users pending SCIM provisioning conflict index',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_pending_scim_management_confirmation"
        ON "users" ("provisioned_by_organization_id", "id")
        WHERE "provisioning_status" = 'pendingConfirmation'
      `,
    },
  ],
} satisfies MigrationExecutor;
