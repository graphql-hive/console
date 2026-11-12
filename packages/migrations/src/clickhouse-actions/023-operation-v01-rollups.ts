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
  const table = `operations_v01_${granularity}`;

  await exec(`
    CREATE TABLE IF NOT EXISTS ${table}
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
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${table}_mv TO ${table}
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
    CREATE TABLE IF NOT EXISTS ${table}_by_timestamp
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
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${table}_by_timestamp_mv TO ${table}_by_timestamp
    AS (
      SELECT
        target,
        graph_id,
        graph_version_id,
        ${bucket}(timestamp) AS timestamp,
        ${aggregateStates(granularity)}
      FROM operations
      GROUP BY target, graph_id, timestamp, graph_version_id
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS ${table}_by_client
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
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${table}_by_client_mv TO ${table}_by_client
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

/**
 * Replacement for `subscription_operations_daily` with the `graph_id` dimension,
 * so conditional breaking change detection can be scoped to a graph.
 */
const createSubscriptionRollups = async (exec: (query: string) => Promise<void>) => {
  await exec(`
    CREATE TABLE IF NOT EXISTS subscription_operations_v01_daily
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      total UInt64 CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, graph_id, timestamp, hash)
    ORDER BY (target, graph_id, timestamp, hash, client_name, client_version)
    TTL timestamp + INTERVAL 1 YEAR
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS subscription_operations_v01_daily_mv TO subscription_operations_v01_daily
    AS (
      SELECT
        target,
        graph_id,
        toStartOfDay(timestamp) AS timestamp,
        hash,
        client_name,
        client_version,
        CAST(count() AS UInt64) AS total
      FROM subscription_operations
      GROUP BY target, graph_id, timestamp, hash, client_name, client_version
    )
  `);
};

/**
 * Replacements for `coordinate_counts_*` (020) and `coordinate_errors_*` (021) with the
 * `graph_id` and `graph_version_id` dimensions. Created alongside the old tables.
 * See 020 and 021 for the query patterns these tables are designed for.
 *
 * Minutely tables are fed from the source tables, hourly from minutely and daily from hourly.
 * `expires_at` is part of the GROUP BY so a plan (retention) change does not override metrics early.
 */
const createCoordinateRollups = async (
  exec: (query: string) => Promise<void>,
  granularity: Granularity,
  bucket: 'toStartOfMinute' | 'toStartOfHour' | 'toStartOfDay',
  partitionBy: string,
  ttl: string,
  hashCodec: 'ZSTD(1)' | 'LZ4',
) => {
  const counts = `coordinate_counts_v01_${granularity}`;
  const errors = `coordinate_errors_v01_${granularity}`;
  const source = granularity === 'daily' ? 'hourly' : 'minutely';

  await exec(`
    CREATE TABLE IF NOT EXISTS ${counts}
    (
      target UUID
      , graph_id LowCardinality(String) CODEC(ZSTD(1))
      -- md5 of the operation stored as raw binary (use hex() on output and unhex() on input)
      , hash FixedString(16) CODEC(${hashCodec})
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , graph_version_id String CODEC(ZSTD(1))
      , total ${pickUInt(granularity)} CODEC(T64, ZSTD(1))

      , PROJECTION hash_order (
          SELECT target, graph_id, hash, coordinate, timestamp, expires_at, graph_version_id, total
          ORDER BY (target, graph_id, hash, coordinate, timestamp, graph_version_id, expires_at)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, coordinate, hash, timestamp)
    ORDER BY (target, graph_id, coordinate, hash, timestamp, graph_version_id, expires_at)
    TTL ${ttl}
    SETTINGS
      index_granularity = 8192
      , deduplicate_merge_projection_mode = 'rebuild'
      , ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS ${errors}
    (
      target UUID
      , graph_id LowCardinality(String) CODEC(ZSTD(1))
      -- md5 of the operation stored as raw binary (use hex() on output and unhex() on input)
      , hash FixedString(16) CODEC(${hashCodec})
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , code LowCardinality(String) CODEC(ZSTD(1))
      , graph_version_id String CODEC(ZSTD(1))
      , total_errors ${pickUInt(granularity)} CODEC(T64, ZSTD(1))

      , PROJECTION hash_order (
          SELECT target, graph_id, hash, coordinate, code, timestamp, expires_at, graph_version_id, total_errors
          ORDER BY (target, graph_id, hash, coordinate, code, timestamp, graph_version_id, expires_at)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, coordinate, code, timestamp, hash)
    ORDER BY (target, graph_id, coordinate, code, timestamp, hash, graph_version_id, expires_at)
    TTL ${ttl}
    SETTINGS
      index_granularity = 8192
      , deduplicate_merge_projection_mode = 'rebuild'
      , ttl_only_drop_parts = 1
  `);

  if (granularity === 'minutely') {
    await exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${counts}_mv TO ${counts}
      AS
      SELECT
        target
        , graph_id
        , unhex(hash) AS hash
        , toStartOfMinute(timestamp) AS timestamp
        , toStartOfMinute(expires_at) AS expires_at
        , coord_total.1 AS coordinate
        , graph_version_id
        , CAST(sum(coord_total.2) AS UInt32) AS total
      FROM operations
      ARRAY JOIN coordinate_totals AS coord_total
      GROUP BY target, graph_id, coordinate, hash, timestamp, graph_version_id, expires_at
    `);

    await exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${errors}_mv TO ${errors}
      AS
      SELECT
        target
        , graph_id
        , hash
        , toStartOfMinute(timestamp) AS timestamp
        , toStartOfMinute(expires_at) AS expires_at
        , error.path AS coordinate
        , error.code AS code
        , graph_version_id
        , CAST(count() AS UInt32) AS total_errors
      FROM operation_errors
      ARRAY JOIN errors AS error
      GROUP BY target, graph_id, coordinate, code, timestamp, hash, graph_version_id, expires_at
    `);
    return;
  }

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${counts}_mv TO ${counts}
    AS
    SELECT
      target
      , graph_id
      , hash
      , ${bucket}(timestamp) AS timestamp
      , ${bucket}(expires_at) AS expires_at
      , coordinate
      , graph_version_id
      , CAST(sum(total) AS ${pickUInt(granularity)}) AS total
    FROM coordinate_counts_v01_${source}
    GROUP BY target, graph_id, coordinate, hash, timestamp, graph_version_id, expires_at
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${errors}_mv TO ${errors}
    AS
    SELECT
      target
      , graph_id
      , hash
      , ${bucket}(timestamp) AS timestamp
      , ${bucket}(expires_at) AS expires_at
      , coordinate
      , code
      , graph_version_id
      , CAST(sum(total_errors) AS ${pickUInt(granularity)}) AS total_errors
    FROM coordinate_errors_v01_${source}
    GROUP BY target, graph_id, coordinate, code, timestamp, hash, graph_version_id, expires_at
  `);
};

export const action: Action = async exec => {
  await createRollups(exec, 'minutely', 'toStartOfMinute', 'toStartOfHour(timestamp)', '24 HOUR');
  await createRollups(exec, 'hourly', 'toStartOfHour', 'toYYYYMMDD(timestamp)', '30 DAY');
  await createRollups(exec, 'daily', 'toStartOfDay', 'toYYYYMM(timestamp)', '1 YEAR');
  await createSubscriptionRollups(exec);

  // Order matters: hourly reads from minutely, daily reads from hourly.
  await createCoordinateRollups(
    exec,
    'minutely',
    'toStartOfMinute',
    'toStartOfHour(timestamp)',
    // only store for 24hr because after that, the hourly or daily table will be used
    'least(timestamp + toIntervalHour(24), expires_at)',
    'ZSTD(1)',
  );
  await createCoordinateRollups(
    exec,
    'hourly',
    'toStartOfHour',
    'toYYYYMMDD(timestamp)',
    // after 30 days, relative time ranges only use the daily table
    'least(timestamp + toIntervalDay(30), expires_at)',
    'LZ4',
  );
  await createCoordinateRollups(
    exec,
    'daily',
    'toStartOfDay',
    'toYYYYMM(timestamp)',
    'expires_at',
    'LZ4',
  );
};
