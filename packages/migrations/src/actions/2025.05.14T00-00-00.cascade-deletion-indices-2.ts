import { type MigrationExecutor } from '../pg-migrator';

/**
 * This migration adds a bunch of indices for columns that have cascade triggers.
 * Adding these significantly improves the delete performance.
 */
export default {
  name: '2025.05.14T00-00-00.cascade-deletion-indices-2.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: 'index schema_versions_action_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_versions_action_id" ON "schema_versions"("action_id")
      `,
    },
    // For cascading delete from "schema_log"
    {
      name: 'index versions_commit_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "versions_commit_id" ON "versions"("commit_id")
      `,
    },
    // For cascading delete from "targets"
    {
      name: 'index versions_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "versions_target_id" ON "versions"("target_id")
      `,
    },
    // For cascading delete from "organizations"
    {
      name: 'index tokens_organization_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "tokens_organization_id" ON "tokens"("organization_id")
      `,
    },
    // For cascading delete from "projects"
    {
      name: 'index tokens_project_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "tokens_project_id" ON "tokens"("project_id")
      `,
    },
    // For cascading delete from "targets"
    {
      name: 'index tokens_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "tokens_target_id" ON "tokens"("target_id")
      `,
    },
    // For cascading delete from "targets"
    {
      name: 'index target_validation_destination_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "target_validation_destination_target_id" ON "target_validation"("destination_target_id")
      `,
    },
    // For cascading delete from "targets"
    {
      name: 'index schema_coordinate_status_created_in_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_coordinate_status_created_in_version_id" ON "schema_coordinate_status"("created_in_version_id")
      `,
    },
    // For cascading delete from "targets"
    {
      name: 'index schema_coordinate_status_deprecated_in_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_coordinate_status_deprecated_in_version_id" ON "schema_coordinate_status"("deprecated_in_version_id")
      `,
    },
    // For cascading set NULL from "users"
    {
      name: 'index document_preflight_scripts_created_by_user_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "document_preflight_scripts_created_by_user_id" ON "document_preflight_scripts"("created_by_user_id") WHERE "created_by_user_id" IS NOT NULL
      `,
    },
    // For cascading set NULL from "users"
    {
      name: 'index document_collections_created_by_user_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "document_collections_created_by_user_id" ON "document_collections"("created_by_user_id") WHERE "created_by_user_id" IS NOT NULL
      `,
    },
    // For cascading delete from "contract_versions"
    {
      name: 'index contract_version_changes_contract_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "contract_version_changes_contract_version_id" ON "contract_version_changes"("contract_version_id")
      `,
    },
    // For cascading delete from "contract_versions"
    {
      name: 'index contract_checks_compared_contract_version_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "contract_checks_compared_contract_version_id" ON "contract_checks"("compared_contract_version_id")
      `,
    },
    // For cascading delete from "contracts"
    {
      name: 'index contracts_contract_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "contracts_contract_id" ON "contract_checks"("contract_id")
      `,
    },
    // For cascading delete from "targets"
    {
      name: 'index alerts_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "alerts_target_id" ON "alerts"("target_id")
      `,
    },
    // For cascading delete from "projects"
    {
      name: 'index alerts_project_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "alerts_project_id" ON "alerts"("project_id")
      `,
    },
    // For cascading delete from "alert_channels"
    {
      name: 'index alerts_alert_channel_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "alerts_alert_channel_id" ON "alerts"("alert_channel_id")
      `,
    },
    // For cascading delete from "organizations"
    {
      name: 'index tokens_organization_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "tokens_organization_id" ON "tokens"("organization_id")
      `,
    },
    // For cascading delete from "projects"
    {
      name: 'index tokens_project_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "tokens_project_id" ON "tokens"("project_id")
      `,
    },
    // For cascading delete from "targets"
    {
      name: 'index tokens_target_id',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "tokens_target_id" ON "tokens"("target_id")
      `,
    },
  ],
} satisfies MigrationExecutor;
