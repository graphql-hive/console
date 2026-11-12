import type { Action } from '../clickhouse';

/**
 * Adds the `graph_id` and `graph_version_id` dimensions to the raw usage tables.
 * Shipped ahead of the rollups that read them, so the rollups can be backfilled from these tables.
 */
export const action: Action = async exec => {
  await exec(`
    ALTER TABLE operations
      ADD COLUMN IF NOT EXISTS graph_id LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id String DEFAULT '' CODEC(ZSTD(1)) AFTER graph_id
  `);

  await exec(`
    ALTER TABLE subscription_operations
      ADD COLUMN IF NOT EXISTS graph_id LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id String DEFAULT '' CODEC(ZSTD(1)) AFTER graph_id
  `);

  await exec(`
    ALTER TABLE operation_errors
      ADD COLUMN IF NOT EXISTS graph_id LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id String DEFAULT '' CODEC(ZSTD(1)) AFTER graph_id
  `);

  await exec(`
    ALTER TABLE operation_collection
      ADD COLUMN graph_id LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN graph_version_id String DEFAULT '' CODEC(ZSTD(1)) AFTER graph_id,
      MODIFY ORDER BY (target, hash, timestamp, graph_id, graph_version_id)
  `);

  await exec(`
    ALTER TABLE app_deployment_usage
      ADD COLUMN graph_id LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)) AFTER app_version,
      ADD COLUMN graph_version_id String DEFAULT '' CODEC(ZSTD(1)) AFTER graph_id,
      MODIFY ORDER BY (target_id, app_name, app_version, graph_id, graph_version_id)
  `);
};
