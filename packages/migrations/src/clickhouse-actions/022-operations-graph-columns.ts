import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    ALTER TABLE default.operations
      ADD COLUMN IF NOT EXISTS graph_id LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id String DEFAULT '' CODEC(ZSTD(1)) AFTER graph_id
  `);
};
