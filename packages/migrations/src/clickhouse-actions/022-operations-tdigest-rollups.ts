import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    ALTER TABLE default.operations
      ADD COLUMN IF NOT EXISTS graph_id LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)) AFTER target,
      ADD COLUMN IF NOT EXISTS graph_version_id String DEFAULT '' CODEC(ZSTD(1)) AFTER graph_id
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.operations_tdigest_minutely
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      total UInt32 CODEC(T64, ZSTD(1)),
      total_ok UInt32 CODEC(T64, ZSTD(1)),
      duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
      duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1)),
      PROJECTION by_graph_version_id
      (
        SELECT *
        ORDER BY (target, graph_id, graph_version_id, hash, client_name, client_version, timestamp)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY tuple()
    PRIMARY KEY (target, graph_id, hash)
    ORDER BY (target, graph_id, hash, client_name, client_version, timestamp, graph_version_id)
    TTL timestamp + INTERVAL 24 HOUR
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1, deduplicate_merge_projection_mode = 'rebuild'
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_tdigest_minutely_mv
    TO default.operations_tdigest_minutely
    AS
    SELECT
      target,
      graph_id,
      graph_version_id,
      toStartOfMinute(timestamp) AS timestamp,
      hash,
      client_name,
      client_version,
      CAST(count() AS UInt32) AS total,
      CAST(sum(ok) AS UInt32) AS total_ok,
      avgState(duration) AS duration_avg,
      quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
    FROM default.operations
    GROUP BY
      target,
      graph_id,
      graph_version_id,
      hash,
      client_name,
      client_version,
      timestamp
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.operations_tdigest_hourly
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      total UInt32 CODEC(T64, ZSTD(1)),
      total_ok UInt32 CODEC(T64, ZSTD(1)),
      duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
      duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1)),
      PROJECTION by_graph_version_id
      (
        SELECT *
        ORDER BY (target, graph_id, graph_version_id, hash, client_name, client_version, timestamp)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, graph_id, hash)
    ORDER BY (target, graph_id, hash, client_name, client_version, timestamp, graph_version_id)
    TTL timestamp + INTERVAL 30 DAY
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1, deduplicate_merge_projection_mode = 'rebuild'
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_tdigest_hourly_mv
    TO default.operations_tdigest_hourly
    AS
    SELECT
      target,
      graph_id,
      graph_version_id,
      toStartOfHour(timestamp) AS timestamp,
      hash,
      client_name,
      client_version,
      CAST(count() AS UInt32) AS total,
      CAST(sum(ok) AS UInt32) AS total_ok,
      avgState(duration) AS duration_avg,
      quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
    FROM default.operations
    GROUP BY
      target,
      graph_id,
      graph_version_id,
      hash,
      client_name,
      client_version,
      timestamp
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.operations_tdigest_daily
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      expires_at DateTime('UTC') CODEC(DoubleDelta, LZ4),
      total UInt32 CODEC(T64, ZSTD(1)),
      total_ok UInt32 CODEC(T64, ZSTD(1)),
      duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
      duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1)),
      PROJECTION by_graph_version_id
      (
        SELECT *
        ORDER BY (target, graph_id, graph_version_id, hash, client_name, client_version, timestamp, expires_at)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, graph_id, hash)
    ORDER BY (target, graph_id, hash, client_name, client_version, timestamp, expires_at, graph_version_id)
    TTL expires_at
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1, deduplicate_merge_projection_mode = 'rebuild'
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_tdigest_daily_mv
    TO default.operations_tdigest_daily
    AS
    SELECT
      target,
      graph_id,
      graph_version_id,
      toStartOfDay(timestamp) AS timestamp,
      hash,
      client_name,
      client_version,
      toStartOfDay(expires_at) AS expires_at,
      CAST(count() AS UInt32) AS total,
      CAST(sum(ok) AS UInt32) AS total_ok,
      avgState(duration) AS duration_avg,
      quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
    FROM default.operations
    GROUP BY
      target,
      graph_id,
      graph_version_id,
      hash,
      client_name,
      client_version,
      timestamp,
      expires_at
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.clients_tdigest_minutely
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      total UInt32 CODEC(T64, ZSTD(1)),
      INDEX idx_hash (hash) TYPE set(0) GRANULARITY 1,
      PROJECTION by_graph_version_id
      (
        SELECT *
        ORDER BY (target, graph_id, graph_version_id, client_name, client_version, hash, timestamp)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY tuple()
    PRIMARY KEY (target, graph_id, client_name, client_version)
    ORDER BY (target, graph_id, client_name, client_version, hash, timestamp, graph_version_id)
    TTL timestamp + INTERVAL 24 HOUR
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1, deduplicate_merge_projection_mode = 'rebuild'
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.clients_tdigest_minutely_mv
    TO default.clients_tdigest_minutely
    AS
    SELECT
      target,
      graph_id,
      graph_version_id,
      toStartOfMinute(timestamp) AS timestamp,
      hash,
      client_name,
      client_version,
      CAST(count() AS UInt32) AS total
    FROM default.operations
    GROUP BY
      target,
      graph_id,
      graph_version_id,
      hash,
      client_name,
      client_version,
      timestamp
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.clients_tdigest_hourly
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      total UInt32 CODEC(T64, ZSTD(1)),
      INDEX idx_hash (hash) TYPE set(0) GRANULARITY 1,
      PROJECTION by_graph_version_id
      (
        SELECT *
        ORDER BY (target, graph_id, graph_version_id, client_name, client_version, hash, timestamp)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, graph_id, client_name, client_version)
    ORDER BY (target, graph_id, client_name, client_version, hash, timestamp, graph_version_id)
    TTL timestamp + INTERVAL 30 DAY
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1, deduplicate_merge_projection_mode = 'rebuild'
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.clients_tdigest_hourly_mv
    TO default.clients_tdigest_hourly
    AS
    SELECT
      target,
      graph_id,
      graph_version_id,
      toStartOfHour(timestamp) AS timestamp,
      hash,
      client_name,
      client_version,
      CAST(count() AS UInt32) AS total
    FROM default.operations
    GROUP BY
      target,
      graph_id,
      graph_version_id,
      hash,
      client_name,
      client_version,
      timestamp
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS default.clients_tdigest_daily
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      graph_id LowCardinality(String) CODEC(ZSTD(1)),
      graph_version_id String CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      hash String CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      expires_at DateTime('UTC') CODEC(DoubleDelta, LZ4),
      total UInt32 CODEC(T64, ZSTD(1)),
      INDEX idx_hash (hash) TYPE set(0) GRANULARITY 1,
      PROJECTION by_graph_version_id
      (
        SELECT *
        ORDER BY (target, graph_id, graph_version_id, client_name, client_version, hash, timestamp, expires_at)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, graph_id, client_name, client_version)
    ORDER BY (target, graph_id, client_name, client_version, hash, timestamp, expires_at, graph_version_id)
    TTL expires_at
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1, deduplicate_merge_projection_mode = 'rebuild'
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.clients_tdigest_daily_mv
    TO default.clients_tdigest_daily
    AS
    SELECT
      target,
      graph_id,
      graph_version_id,
      toStartOfDay(timestamp) AS timestamp,
      hash,
      client_name,
      client_version,
      toStartOfDay(expires_at) AS expires_at,
      CAST(count() AS UInt32) AS total
    FROM default.operations
    GROUP BY
      target,
      graph_id,
      graph_version_id,
      hash,
      client_name,
      client_version,
      timestamp,
      expires_at
  `);
};
