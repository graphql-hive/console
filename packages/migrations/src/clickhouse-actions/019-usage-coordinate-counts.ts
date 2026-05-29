import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  /**
   * Add a column to hold the real executed field counts. This differs from existing counts, which
   * are for the number of times the operation was executed and (in the operation_collection table)
   * whether or not the coordinate is included in an operation's body.
   */
  await exec(`
    ALTER TABLE default.operations
    -- Counts the coordinates actually called during execution. This is necessary so that
    -- field availability is not based on operation count, which would skew the availability
    -- to show a higher error rate (e.g. if an array has one object that errored, then the
    -- availability) should be (1-N)/N, not 0%
    ADD COLUMN IF NOT EXISTS coordinate_totals Map(String, UInt32) CODEC(ZSTD(1))
    ;
  `);

  /**
   * This replaces the counts for display purpose (explorer page) by coordinate. The existing counts
   * represent the number of operations calls that used the coordinate, rather than the number of times
   * the coordinate was executed/resolved.
   *
   * The main query for table is to get the total number of calls to a coordinate, which can be used in
   * conjunction with the coordinate_errors_minutely data to calculate availability.
   *
   * (1) Total request count for a coordinate (used to calculate availability)
   *
   * SELECT sum(total) as total
   * FROM default.coordinate_counts_minutely
   * WHERE target = '<uuid>'
   *   AND coordinate = 'User.ssn'
   *   AND timestamp >= now() - INTERVAL 2 HOUR
   * GROUP BY
   *   coordinate
   *
   * (2) For an operation, how many times was a field requested?
   *
   * SELECT hash, coordinate, sum(total) as total
   * FROM default.coordinate_counts_minutely
   * WHERE target = '<uuid>'
   *   AND hash = unhex('<hash>')
   *   AND timestamp >= now() - INTERVAL 2 HOUR
   * GROUP BY
   *   coordinate
   *
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.coordinate_counts_minutely
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
      , coordinate String CODEC(ZSTD(1))
      , total UInt32 CODEC(T64, ZSTD(1))

      , PROJECTION hash_order (
          SELECT target, hash, coordinate, timestamp, expires_at, total
          ORDER BY (target, hash, coordinate, timestamp, expires_at)
      )
    )
    -- The engine is kept as a merge tree to 
    ENGINE = SummingMergeTree
    PARTITION BY toStartOfHour(timestamp)
    PRIMARY KEY (target, coordinate, hash, timestamp)
    ORDER BY (target, coordinate, hash, timestamp, expires_at)
    -- only store for 24hr because after that, the hourly or daily table will be used
    TTL least(timestamp + toIntervalHour(24), expires_at)
    SETTINGS
      index_granularity = 8192
      , deduplicate_merge_projection_mode = 'rebuild'
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_coordinate_counts_minutely
    TO default.coordinate_counts_minutely
    AS
    SELECT
      target
      , hash
      , toStartOfMinute(timestamp) AS timestamp
      , toStartOfMinute(expires_at) AS expires_at
      , coord_total.1 as coordinate
      -- Cast the UInt64 sum back down to UInt32 to match the target table
      , CAST(sum(coord_total.2) AS UInt32) as total
    FROM default.operations
    ARRAY JOIN coordinate_totals as coord_total
    GROUP BY
        target
      , coordinate
      , hash
      , timestamp
      -- expires at is important in the group by to avoid overriding metrics early if the plan changes
      , expires_at
    ;
  `);

  /**
   * Cascading hourly coordinate counts table
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.coordinate_counts_hourly
    (
      target UUID
      , hash FixedString(16) CODEC(LZ4)
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , total UInt32 CODEC(T64, ZSTD(1))

      , PROJECTION hash_order (
          SELECT target, hash, coordinate, timestamp, expires_at, total
          ORDER BY (target, hash, coordinate, timestamp, expires_at)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, coordinate, hash, timestamp)
    ORDER BY (target, coordinate, hash, timestamp, expires_at)
    TTL least(timestamp + toIntervalDay(30), expires_at)
    SETTINGS
      index_granularity = 8192
      , deduplicate_merge_projection_mode = 'rebuild'
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_coordinate_counts_hourly
    TO default.coordinate_counts_hourly
    AS
    SELECT
      target
      , hash
      , toStartOfHour(timestamp) AS timestamp
      , toStartOfHour(expires_at) AS expires_at
      , coordinate
      , CAST(sum(total) AS UInt32) as total
    FROM default.coordinate_counts_minutely
    GROUP BY
        target
      , coordinate
      , hash
      , timestamp
      , expires_at
    ;
  `);

  /**
   * Cascading daily coordinate counts table
   */
  await exec(`
    CREATE TABLE IF NOT EXISTS default.coordinate_counts_daily
    (
      target UUID
      , hash FixedString(16) CODEC(LZ4)
      , timestamp DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , expires_at DateTime('UTC') CODEC(DoubleDelta, ZSTD(1))
      , coordinate String CODEC(ZSTD(1))
      , total UInt32 CODEC(T64, ZSTD(1))

      , PROJECTION hash_order (
          SELECT target, hash, coordinate, timestamp, expires_at, total
          ORDER BY (target, hash, coordinate, timestamp, expires_at)
      )
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    PRIMARY KEY (target, coordinate, hash, timestamp)
    ORDER BY (target, coordinate, hash, timestamp, expires_at)
    TTL expires_at
    SETTINGS
      index_granularity = 8192
      , deduplicate_merge_projection_mode = 'rebuild'
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_coordinate_counts_daily
    TO default.coordinate_counts_daily
    AS
    SELECT
      target
      , hash
      , toStartOfDay(timestamp) AS timestamp
      , toStartOfDay(expires_at) AS expires_at
      , coordinate
      , CAST(sum(total) AS UInt32) as total
    FROM default.coordinate_counts_hourly
    GROUP BY
        target
      , coordinate
      , hash
      , timestamp
      , expires_at
    ;
  `);
};
