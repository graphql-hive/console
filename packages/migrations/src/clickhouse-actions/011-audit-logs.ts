import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      id String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      organization_id LowCardinality(String) CODEC(ZSTD(1)),
      event_action LowCardinality(String) CODEC(ZSTD(1)),
      user_id String CODEC(ZSTD(1)),
      user_email String CODEC(ZSTD(1)),
      metadata String CODEC(ZSTD(1)),
      INDEX idx_action event_action TYPE set(0) GRANULARITY 1,
      INDEX idx_user_id user_id TYPE bloom_filter(0.001) GRANULARITY 1,
    )
    ENGINE = MergeTree
    PARTITION BY toYearWeek(timestamp, 1, 'UTC')
    ORDER BY (organization_id, timestamp)
    TTL timestamp + INTERVAL 1 YEAR
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
  `);
};
