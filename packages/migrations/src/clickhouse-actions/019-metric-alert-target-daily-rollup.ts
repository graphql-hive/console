import type { Action } from '../clickhouse';

// Daily by-target rollup for the metric-alert evaluator. Mirrors the
// minutely/hourly rollups in 018 but bucketed per day, so long-window rules
// (>= 7 days) read ~60 daily buckets for a 30-day query instead of ~1,440
// hourly ones. The 90-day TTL covers the 60-day (2x window) scan of a 30-day
// rule.
const tableColumns = `
  target LowCardinality(String) CODEC(ZSTD(1)),
  timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
  total UInt32 CODEC(T64, ZSTD(1)),
  total_ok UInt32 CODEC(T64, ZSTD(1)),
  duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
  duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
`;

export const action: Action = async exec => {
  await exec(`
    CREATE TABLE IF NOT EXISTS default.operations_by_target_daily
    (
      ${tableColumns}
    )
    ENGINE = SummingMergeTree
    -- Monthly, not toYYYYMMDD like the hourly rollup: daily buckets would make
    -- one partition per day. Keep monthly so a 90-day TTL has few parts.
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, timestamp)
    ORDER BY (target, timestamp)
    TTL timestamp + INTERVAL 90 DAY
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_by_target_daily_mv TO default.operations_by_target_daily
    AS (
      SELECT
        target,
        toStartOfDay(timestamp) AS timestamp,
        CAST(count() AS UInt32) AS total,
        CAST(sum(ok) AS UInt32) AS total_ok,
        avgState(duration) AS duration_avg,
        quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
      FROM default.operations
      GROUP BY
        target,
        timestamp
    )
  `);
};
