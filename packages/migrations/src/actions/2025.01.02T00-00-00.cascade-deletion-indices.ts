import { type MigrationExecutor } from '../pg-migrator';

/**
 * This migration adds a bunch of indices for columns that have cascade triggers.
 * Adding these significantly improves the delete performance.
 */
export default {
  name: '2025.01.02T00-00-00.cascade-deletion-indices.ts',
  run: ({ sql }) => [
    {
      name: 'index schema_checks_manual_approval_user_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_checks_manual_approval_user_id"
          ON "schema_checks"("manual_approval_user_id")
            WHERE "manual_approval_user_id" is not null
      `,
    },
    {
      name: 'index organization_member_user_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_member_user_id"
          ON "organization_member"("user_id")
      `,
    },
    {
      name: 'index organization_member_organization_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_member_organization_id"
          ON "organization_member"("organization_id")
      `,
    },
    {
      name: 'index organization_member_roles_organization_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_member_roles_organization_id"
          ON "organization_member_roles"("organization_id")
      `,
    },
    {
      name: 'index projects_org_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_org_id" ON "projects"("org_id")
      `,
    },
    {
      name: 'index targets_project_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "targets_project_id" ON "targets"("project_id")
      `,
    },
    {
      name: 'index schema_versions_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_target_id" ON "schema_versions"("target_id")
      `,
    },
    {
      name: 'index schema_checks_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_checks_target_id" ON "schema_checks"("target_id")
      `,
    },
    {
      name: 'index schema_log_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_log_target_id" ON "schema_log"("target_id")
      `,
    },
    {
      name: 'index schema_log_project_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_log_project_id" ON "schema_log"("project_id")
      `,
    },
    {
      name: 'index contract_versions_schema_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "contract_versions_schema_version_id" ON "contract_versions"("schema_version_id")
      `,
    },
    {
      name: 'index schema_version_to_log_action_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_version_to_log_action_id" ON "schema_version_to_log"("action_id")
      `,
    },
    {
      name: 'index schema_version_to_log_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_version_to_log_version_id" ON "schema_version_to_log"("version_id")
      `,
    },
    {
      name: 'index contract_schema_change_approvals_schema_change_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "contract_schema_change_approvals_schema_change_id" ON "contract_schema_change_approvals"("schema_change_id")
      `,
    },
    {
      name: 'index schema_checks_schema_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_checks_schema_version_id" ON "schema_checks"("schema_version_id")
      `,
    },
    {
      name: 'index schema_versions_diff_schema_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_diff_schema_version_id" ON "schema_versions"("diff_schema_version_id")
      `,
    },
    {
      name: 'index organizations_ownership_transfer_user_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "organizations_ownership_transfer_user_id" ON "organizations"("ownership_transfer_user_id")
      `,
    },
    {
      name: 'index users_supertoken_user_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_supertoken_user_id_missing"
          ON "users"("supertoken_user_id")
          WHERE 'supertoken_user_id' IS NULL
      `,
    },
  ],
} satisfies MigrationExecutor;
