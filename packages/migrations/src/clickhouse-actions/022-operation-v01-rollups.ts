import type { Action } from '../clickhouse';

const aggregateColumns = `
  total UInt32 CODEC(T64, ZSTD(1)),
  total_ok UInt32 CODEC(T64, ZSTD(1)),
  duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
  duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
`;

const aggregateStates = `
  CAST(count() AS UInt32) AS total,
  CAST(sum(ok) AS UInt32) AS total_ok,
  avgState(duration) AS duration_avg,
  quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
`;

const createRollups = async (
  exec: (query: string) => Promise<void>,
  granularity: 'minutely' | 'hourly' | 'daily',
  bucket: 'toStartOfMinute' | 'toStartOfHour' | 'toStartOfDay',
  partitionBy: string,
  ttlInterval: string,
) => {
  const table = `operations_v01_${granularity}`;

  await exec(`
    CREATE TABLE IF NOT EXISTS default.${table}
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      ${aggregateColumns}
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, hash)
    ORDER BY (target, hash, client_name, client_version, timestamp)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.${table}_mv TO default.${table}
    AS (
      SELECT
        target,
        ${bucket}(timestamp) AS timestamp,
        hash,
        client_name,
        client_version,
        ${aggregateStates}
      FROM default.operations
      GROUP BY target, hash, client_name, client_version, timestamp
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.${table}_by_timestamp
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      ${aggregateColumns}
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, timestamp)
    ORDER BY (target, timestamp)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.${table}_by_timestamp_mv TO default.${table}_by_timestamp
    AS (
      SELECT
        target,
        ${bucket}(timestamp) AS timestamp,
        ${aggregateStates}
      FROM default.operations
      GROUP BY target, timestamp
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.${table}_by_client
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      ${aggregateColumns}
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, client_name, client_version, timestamp)
    ORDER BY (target, client_name, client_version, timestamp)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.${table}_by_client_mv TO default.${table}_by_client
    AS (
      SELECT
        target,
        client_name,
        client_version,
        ${bucket}(timestamp) AS timestamp,
        ${aggregateStates}
      FROM default.operations
      GROUP BY target, client_name, client_version, timestamp
    )
  `);
};

export const action: Action = async exec => {
  await createRollups(exec, 'minutely', 'toStartOfMinute', 'toStartOfHour(timestamp)', '24 HOUR');
  await createRollups(exec, 'hourly', 'toStartOfHour', 'toYYYYMMDD(timestamp)', '30 DAY');
  await createRollups(exec, 'daily', 'toStartOfDay', 'toYYYYMM(timestamp)', '1 YEAR');
};
