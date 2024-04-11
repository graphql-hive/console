import type { Action } from '../clickhouse';

export const action: Action = async (exec, _query, isHiveCloud) => {
  let where = '';

  if (isHiveCloud) {
    // Starts aggregating data the next day of the migration (deployment)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const startOfTomorrow = tomorrow.toISOString().split('T')[0];

    where = `WHERE toDate(timestamp) >= toDate('${startOfTomorrow}')`;
  }

  await Promise.all([
    // Create hourly and minutely aggregates for coordinates
    exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS default.coordinates_hourly
      (
        target LowCardinality(String) CODEC(ZSTD(1)),
        hash String CODEC(ZSTD(1)), 
        timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
        expires_at DateTime('UTC') CODEC(DoubleDelta, LZ4),
        total UInt32 CODEC(T64, ZSTD(1)),
        coordinate String CODEC(ZSTD(1))
      )
      ENGINE = SummingMergeTree
      PARTITION BY toYYYYMM(timestamp)
      PRIMARY KEY (target, coordinate, hash)
      ORDER BY (target, coordinate, hash, timestamp)
      TTL timestamp + INTERVAL 30 DAY
      SETTINGS index_granularity = 8192
      AS
        SELECT
          target,
          hash,
          toStartOfHour(timestamp) AS timestamp,
          toStartOfHour(expires_at) AS expires_at,
          sum(total) AS total,
          coordinate
        FROM default.operation_collection
        ARRAY JOIN coordinates as coordinate
        ${where}
        GROUP BY
          target,
          coordinate,
          hash,
          timestamp,
          expires_at
    `),
    exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS default.coordinates_minutely
      (
        target LowCardinality(String) CODEC(ZSTD(1)),
        hash String CODEC(ZSTD(1)), 
        timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
        expires_at DateTime('UTC') CODEC(DoubleDelta, LZ4),
        total UInt32 CODEC(T64, ZSTD(1)),
        coordinate String CODEC(ZSTD(1))
      )
      ENGINE = SummingMergeTree
      PARTITION BY tuple()
      PRIMARY KEY (target, coordinate, hash)
      ORDER BY (target, coordinate, hash, timestamp)
      TTL timestamp + INTERVAL 24 HOUR
      SETTINGS index_granularity = 8192
      AS
        SELECT
          target,
          hash,
          toStartOfMinute(timestamp) AS timestamp,
          toStartOfMinute(expires_at) AS expires_at,
          sum(total) AS total,
          coordinate
        FROM default.operation_collection
        ${where}
        ARRAY JOIN coordinates as coordinate
        GROUP BY
          target,
          coordinate,
          hash,
          timestamp,
          expires_at
    `),
    // Create hourly and minutely aggregates for clients
    exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS default.clients_hourly
      (
        target LowCardinality(String) CODEC(ZSTD(1)),
        client_name String CODEC(ZSTD(1)),
        client_version String CODEC(ZSTD(1)),
        hash String CODEC(ZSTD(1)), 
        timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
        expires_at DateTime('UTC') CODEC(DoubleDelta, LZ4),
        total UInt32 CODEC(T64, ZSTD(1)),
        INDEX idx_hash (hash) TYPE set(0) GRANULARITY 1
      )
      ENGINE = SummingMergeTree
      PARTITION BY toYYYYMM(timestamp)
      PRIMARY KEY (target, client_name, client_version)
      ORDER BY (target, client_name, client_version, hash, timestamp)
      TTL timestamp + INTERVAL 30 DAY
      SETTINGS index_granularity = 8192
      AS
        SELECT
        target,
        client_name,
        client_version,
        hash,
        toStartOfHour(timestamp) AS timestamp,
        toStartOfHour(expires_at) AS expires_at,
        count() AS total
      FROM default.operations
      ${where}
      GROUP BY
        target,
        client_name,
        client_version,
        hash,
        timestamp,
        expires_at
    `),
    exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS default.clients_minutely
      (
        target LowCardinality(String) CODEC(ZSTD(1)),
        client_name String CODEC(ZSTD(1)),
        client_version String CODEC(ZSTD(1)),
        hash String CODEC(ZSTD(1)), 
        timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
        expires_at DateTime('UTC') CODEC(DoubleDelta, LZ4),
        total UInt32 CODEC(T64, ZSTD(1)),
        INDEX idx_hash (hash) TYPE set(0) GRANULARITY 1
      )
      ENGINE = SummingMergeTree
      PARTITION BY tuple()
      PRIMARY KEY (target, client_name, client_version)
      ORDER BY (target, client_name, client_version, hash, timestamp)
      TTL timestamp + INTERVAL 24 HOUR
      SETTINGS index_granularity = 8192
      AS
        SELECT
        target,
        client_name,
        client_version,
        hash,
        toStartOfMinute(timestamp) AS timestamp,
        toStartOfMinute(expires_at) AS expires_at,
        count() AS total
      FROM default.operations
      ${where}
      GROUP BY
        target,
        client_name,
        client_version,
        hash,
        timestamp,
        expires_at
    `),
  ]);
};
