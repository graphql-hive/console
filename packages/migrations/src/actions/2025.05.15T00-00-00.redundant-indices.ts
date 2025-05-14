import { type MigrationExecutor } from '../pg-migrator';

/**
 * This migration removes indices that are covered by other btree indices.
 * This should have no impact on performance while lowering our db footprint.
 */
export default {
  name: '2025.05.15T00-00-00.redundant-indices.ts',
  noTransaction: true,
  run: ({ sql }) => [
    // redundant with schema_versions_cursor_pagination
    {
      name: 'drop index schema_versions_target_id',
      query: sql`
        DROP INDEX CONCURRENTLY IF EXISTS "schema_versions_target_id"
      `,
    },
    // redundant with organization_member_pkey
    {
      name: 'drop index organization_member_organization_id',
      query: sql`
        DROP INDEX CONCURRENTLY IF EXISTS "organization_member_organization_id"
      `,
    },
    // redundant with schema_checks_connection_pagination
    {
      name: 'drop index schema_checks_target_id',
      query: sql`
        DROP INDEX CONCURRENTLY IF EXISTS "schema_checks_target_id"
      `,
    },
    // redundant with schema_version_to_log_pkey
    {
      name: 'drop index schema_version_to_log_version_id',
      query: sql`
        DROP INDEX CONCURRENTLY IF EXISTS "schema_version_to_log_version_id"
      `,
    },
  ],
} satisfies MigrationExecutor;
