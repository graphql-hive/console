import type { Action } from '../clickhouse';

/**
 * Adds the `graph_id` and `graph_version_id` dimensions to the raw usage tables.
 * Shipped ahead of the rollups that read them, so the rollups can be backfilled from these tables.
 */
export const action: Action = async (exec, query) => {
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
};
