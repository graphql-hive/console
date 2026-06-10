import type { Action } from '../clickhouse';

const tableColumns = `
  target LowCardinality(String) CODEC(ZSTD(1)),
  timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
  total UInt32 CODEC(T64, ZSTD(1)),
  total_ok UInt32 CODEC(T64, ZSTD(1)),
  duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
  duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
`;

const selectByTarget = (bucket: 'toStartOfMinute' | 'toStartOfHour') => `
  SELECT
    target,
    ${bucket}(timestamp) AS timestamp,
    CAST(count() AS UInt32) AS total,
    CAST(sum(ok) AS UInt32) AS total_ok,
    avgState(duration) AS duration_avg,
    quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
  FROM default.operations
  GROUP BY
    target,
    timestamp
`;

const createRollup = async (
  exec: (query: string) => Promise<void>,
  table: string,
  bucket: 'toStartOfMinute' | 'toStartOfHour',
  partitionBy: string,
  ttlInterval: string,
) => {
  await exec(`
    CREATE TABLE IF NOT EXISTS default.${table}
    (
      ${tableColumns}
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, timestamp)
    ORDER BY (target, timestamp)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.${table}_mv TO default.${table}
    AS (
      ${selectByTarget(bucket)}
    )
  `);
};

export const action: Action = async exec => {
  await createRollup(
    exec,
    'operations_minutely_by_target',
    'toStartOfMinute',
    'toStartOfHour(timestamp)',
    '24 HOUR',
  );
  await createRollup(
    exec,
    'operations_hourly_by_target',
    'toStartOfHour',
    'toYYYYMMDD(timestamp)',
    '30 DAY',
  );
};
