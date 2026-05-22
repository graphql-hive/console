import type { Action } from '../clickhouse';

/**
 * !IMPORTANT!: All materialized views use "TO" syntax, which is considered best
 * practice for clickhouse because it decouples the data storage from the view logic,
 * which makes it easier to manage migrations and direct inserts.
 */

export const action: Action = async exec => {
  /**
   * This is a source table that gets projected to various data points. Therefore this table's
   * TTL does not need to be dictated by the customer data lifespan.
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.operation_errors
    (
      target UUID
      
      -- hash stores a md5 of the body, coordinate, and operation name
      -- stores as raw binary which requires hex() on returned md5 and unhex() on input
      -- this saves space by allowing a FixedString(16) compared to FixedString(32)
      , hash FixedString(16) CODEC(ZSTD(1))

      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))

      -- Expiration is based on plan retention, but this needs set on insert, but
      -- the expiration will always exceed this table's TTL. This expires_at is
      -- intended to be for the materialized views that are generated from this table
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , errors Array(Tuple(code LowCardinality(String), path String)) CODEC(ZSTD(1))
    )
    ENGINE = MergeTree
    PARTITION BY toStartOfHour(timestamp)
    PRIMARY KEY (target, hash, timestamp)
    ORDER BY (target, hash, timestamp, expires_at)
    TTL timestamp + INTERVAL 3 HOUR
    SETTINGS index_granularity = 8192
    ;
  `);

  /** Minutely metric table */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.coordinate_errors_minutely
    (
      target UUID
      , hash FixedString(16) CODEC(ZSTD(1))
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , code LowCardinality(String) CODEC(ZSTD(1))
      , total_errors UInt32 CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toStartOfHour(timestamp)
    PRIMARY KEY (target, coordinate, code, timestamp, hash)
    ORDER BY (target, coordinate, code, timestamp, hash, expires_at)
    -- only store for 24hr because after that, the hourly or daily table will be used
    TTL least(timestamp + toIntervalHour(24), expires_at)
    SETTINGS index_granularity = 8192
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_coordinate_errors_minutely
    TO default.coordinate_errors_minutely
    AS
    SELECT
      target
      , hash
      , toStartOfMinute(timestamp) AS timestamp
      , toStartOfMinute(expires_at) AS expires_at
      , error.path as coordinate
      , error.code as code
      , count() as total_errors
    FROM default.operation_errors
    ARRAY JOIN errors as error
    GROUP BY
        target
      , error.path
      , timestamp
      , hash
      , error.code
      , expires_at
    ;
  `);

  /**
   * Cascading hourly metric table
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.coordinate_errors_hourly
    (
      target UUID

      -- hash stores a md5 of the body, coordinate, and operation name
      -- stores as raw binary which requires hex() on returned md5 and unhex() on input
      -- this saves space by allowing a FixedString(16) compared to FixedString(32)
      , hash FixedString(16) CODEC(LZ4)

      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , code LowCardinality(String) CODEC(ZSTD(1))
      , total_errors UInt32 CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, coordinate, code, timestamp, hash)
    ORDER BY (target, coordinate, code, timestamp, hash, expires_at)
    -- keep for a maximum of 30 days because after that the relative time range will only use the daily calculations
    TTL least(timestamp + toIntervalDay(30), expires_at)
    SETTINGS index_granularity = 8192
    ;
  `);
  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_coordinate_errors_hourly
    TO default.coordinate_errors_hourly
    AS
    SELECT
      target
      , hash
      , toStartOfHour(timestamp) AS timestamp
      -- Expiration is based on the subscription plan, so it can't be a static interval.
      , toStartOfHour(expires_at) AS expires_at
      , coordinate
      , code
      , sum(total_errors) as total_errors
    FROM default.coordinate_errors_minutely
    GROUP BY
        target
      , coordinate
      , timestamp
      , hash
      , code
      -- Expiration must be a separate group in case the users subscription changes.
      -- When selected, the data will be summed by the ORDER BY. Subscription changes
      -- are rare so any performance implication is minimal.
      , expires_at
    ;
  `);

  /**
   * Use cascading aggregation to create daily
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.coordinate_errors_daily
    (
      target UUID
      , hash FixedString(16) CODEC(LZ4)
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , code LowCardinality(String) CODEC(ZSTD(1))
      , total_errors UInt32 CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, coordinate, code, timestamp, hash)
    ORDER BY (target, coordinate, code, timestamp, hash, expires_at)
    TTL expires_at
    SETTINGS index_granularity = 8192
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_coordinate_errors_daily
    TO default.coordinate_errors_daily
    AS
    SELECT
      target
      , hash
      , toStartOfDay(timestamp) AS timestamp
      , toStartOfDay(expires_at) AS expires_at
      , coordinate
      , code
      , sum(total_errors) as total_errors
    FROM default.coordinate_errors_hourly
    GROUP BY
        target
      , coordinate
      , timestamp
      , hash
      , code
      , expires_at
    ;
  `);

  /**
   * To support querying by coordinate (for schema-wide metrics) AND by hash (for operation specific metrics),
   * create another set of tables that store this same data in a different order...
   */

  /**
   * Minutely Hash Table
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.operation_errors_minutely
    (
      target LowCardinality(UUID)
      , hash FixedString(16) CODEC(LZ4)
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , code LowCardinality(String) CODEC(ZSTD(1))
      , total_errors UInt32 CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toStartOfHour(timestamp)
    -- Hash is placed immediately after target to optimize hash-specific queries
    PRIMARY KEY (target, hash, coordinate, code, timestamp)
    ORDER BY (target, hash, coordinate, code, timestamp, expires_at)
    -- only store for 24hr because after that, the hourly or daily table will be used
    TTL least(timestamp + toIntervalHour(24), expires_at)
    SETTINGS index_granularity = 8192;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_operation_errors_minutely
    TO default.operation_errors_minutely
    AS
    SELECT
      target
      , hash
      , toStartOfMinute(timestamp) AS timestamp
      , toStartOfMinute(expires_at) AS expires_at
      , error.path as coordinate
      , error.code as code
      , count() as total_errors
    FROM default.operation_errors
    ARRAY JOIN errors as error
    GROUP BY
        target
      , hash
      , error.path
      , error.code
      , timestamp
      , expires_at
    ;
  `);

  /**
   * Hourly Hash Table
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.operation_errors_hourly
    (
      target LowCardinality(UUID)
      , hash FixedString(16) CODEC(LZ4)
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , code LowCardinality(String) CODEC(ZSTD(1))
      , total_errors UInt32 CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, hash, coordinate, code, timestamp)
    ORDER BY (target, hash, coordinate, code, timestamp, expires_at)
    TTL expires_at
    SETTINGS index_granularity = 8192
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_operation_errors_hourly
    TO default.operation_errors_hourly
    AS
    SELECT
      target
      , hash
      , toStartOfHour(timestamp) AS timestamp
      , toStartOfHour(expires_at) AS expires_at
      , coordinate
      , code
      , sum(total_errors) as total_errors
    FROM default.operation_errors_minutely
    GROUP BY
        target
      , hash
      , coordinate
      , code
      , timestamp
      , expires_at
    ;
  `);

  /**
   * Daily Hash Table
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.operation_errors_daily
    (
      target LowCardinality(UUID)
      , hash FixedString(16) CODEC(LZ4)
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , code LowCardinality(String) CODEC(ZSTD(1))
      , total_errors UInt32 CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, hash, coordinate, code, timestamp)
    ORDER BY (target, hash, coordinate, code, timestamp, expires_at)
    TTL expires_at
    SETTINGS index_granularity = 8192
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_operation_errors_daily
    TO default.operation_errors_daily
    AS
    SELECT
      target
      , hash
      , toStartOfDay(timestamp) AS timestamp
      , toStartOfDay(expires_at) AS expires_at
      , coordinate
      , code
      , sum(total_errors) as total_errors
    FROM default.operation_errors_hourly
    GROUP BY
        target
      , hash
      , coordinate
      , code
      , timestamp
      , expires_at
    ;
  `);
};
