import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    ALTER TABLE operations
      ADD COLUMN IF NOT EXISTS graph_id UUID CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id UUID CODEC(ZSTD(1)) AFTER graph_id
  `);

  await exec(`
    ALTER TABLE subscription_operations
      ADD COLUMN IF NOT EXISTS graph_id UUID CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id UUID CODEC(ZSTD(1)) AFTER graph_id
  `);

  await exec(`
    ALTER TABLE operation_errors
      ADD COLUMN IF NOT EXISTS graph_id UUID CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id UUID CODEC(ZSTD(1)) AFTER graph_id
  `);

  await exec(`
    ALTER TABLE operation_collection
      ADD COLUMN graph_id UUID CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN graph_version_id UUID CODEC(ZSTD(1)) AFTER graph_id,
      MODIFY ORDER BY (target, hash, timestamp, graph_id, graph_version_id)
  `);
};
