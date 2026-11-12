import type { Action } from '../clickhouse';

type Granularity = 'daily' | 'hourly' | 'minutely';

const pickUInt = (aggregation: Granularity) => (aggregation === 'daily' ? 'UInt64' : 'UInt32');

const aggregateColumns = (granularity: Granularity) => `
  total ${pickUInt(granularity)} CODEC(T64, ZSTD(1)),
  total_ok ${pickUInt(granularity)} CODEC(T64, ZSTD(1)),
  duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
  duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
`;

const aggregateStates = (granularity: Granularity) => `
  CAST(count() AS ${pickUInt(granularity)}) AS total,
  CAST(sum(ok) AS ${pickUInt(granularity)}) AS total_ok,
  avgState(duration) AS duration_avg,
  quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
`;

const createRollups = async (
  exec: (query: string) => Promise<void>,
  granularity: Granularity,
  bucket: 'toStartOfMinute' | 'toStartOfHour' | 'toStartOfDay',
  partitionBy: string,
  ttlInterval: string,
) => {
  // Named `operations_v01_by_<dimensions>_<granularity>`; the granularity goes last,
  // like the existing rollups (`operations_daily`, `clients_hourly`).
  const byHashClient = `operations_v01_by_hash_client_${granularity}`;
  const byTimestamp = `operations_v01_by_timestamp_${granularity}`;
  const byClient = `operations_v01_by_client_${granularity}`;

  await exec(`
    CREATE TABLE IF NOT EXISTS ${byHashClient}
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      ${aggregateColumns(granularity)}
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, timestamp, hash)
    ORDER BY (target, graph_id, timestamp, hash, client_name, client_version, graph_version_id)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${byHashClient}_mv TO ${byHashClient}
    AS (
      SELECT
        target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        hash,
        client_name,
        client_version,
        graph_version_id,
        ${aggregateStates(granularity)}
      FROM operations
      GROUP BY target, graph_id, timestamp, hash, client_name, client_version, graph_version_id
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS ${byTimestamp}
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      graph_version_id String CODEC(ZSTD(1)),
      ${aggregateColumns(granularity)}
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, timestamp)
    ORDER BY (target, graph_id, timestamp, graph_version_id)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${byTimestamp}_mv TO ${byTimestamp}
    AS (
      SELECT
        target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        graph_version_id,
        ${aggregateStates(granularity)}
      FROM operations
      GROUP BY target, graph_id, timestamp, graph_version_id
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS ${byClient}
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      ${aggregateColumns(granularity)}
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, timestamp, client_name, client_version)
    ORDER BY (target, graph_id, timestamp, client_name, client_version, graph_version_id)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${byClient}_mv TO ${byClient}
    AS (
      SELECT
        target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        client_name,
        client_version,
        graph_version_id,
        ${aggregateStates(granularity)}
      FROM operations
      GROUP BY target, graph_id, timestamp, client_name, client_version, graph_version_id
    )
  `);
};

export const action: Action = async exec => {
  await createRollups(exec, 'minutely', 'toStartOfMinute', 'toStartOfHour(timestamp)', '24 HOUR');
  await createRollups(exec, 'hourly', 'toStartOfHour', 'toYYYYMMDD(timestamp)', '30 DAY');
  await createRollups(exec, 'daily', 'toStartOfDay', 'toYYYYMM(timestamp)', '1 YEAR');
};
