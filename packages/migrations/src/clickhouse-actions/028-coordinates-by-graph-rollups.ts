import type { Action } from '../clickhouse';

type Granularity = 'daily' | 'hourly' | 'minutely';

const pickUInt = (aggregation: Granularity) => (aggregation === 'minutely' ? 'UInt32' : 'UInt64');

/**
 * Graph-aware counterparts of the schema coordinate rollups used by the explorer and insights:
 *
 * - `coordinates_by_graph_<granularity>` replaces `coordinates_*` (fed from `operation_collection`)
 * - `coordinate_counts_by_graph_<granularity>` replaces `coordinate_counts_*` (fed from `operations`)
 * - `coordinate_errors_by_graph_<granularity>` replaces `coordinate_errors_*` (fed from `operation_errors`)
 *
 * Only the minutely rollups are aggregated from the source insert. The hourly rollups cascade from
 * the minutely ones and the daily rollups from the hourly ones (minutely -> hourly -> daily), so the
 * expensive `ARRAY JOIN` over the source rows runs once per insert instead of once per granularity.
 * Each materialized view writes `TO` a separately created destination table, and retention is a
 * fixed TTL on time-based partitions.
 *
 * `hash` is the raw md5 as `FixedString(16)` in all of them, like in `operations_by_graph_hash_client_*`
 * (027), so the graph-scoped rollups join on `hash` without conversion. Note that this differs from
 * the legacy `coordinates_*` tables, which store the md5 hex `String`.
 */
const createTables = async (
  exec: (query: string) => Promise<void>,
  granularity: Granularity,
  partitionBy: string,
  ttlInterval: string,
) => {
  // Number of requests per operation document using a coordinate.
  await exec(`
    CREATE TABLE IF NOT EXISTS coordinates_by_graph_${granularity}
    (
      target UUID CODEC(ZSTD(1)),
      graph_id UUID CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      coordinate String CODEC(ZSTD(1)),
      hash FixedString(16) CODEC(ZSTD(1)),
      total ${pickUInt(granularity)} CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, coordinate, hash)
    ORDER BY (target, graph_id, coordinate, hash, timestamp)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  // Number of times a coordinate was resolved.
  await exec(`
    CREATE TABLE IF NOT EXISTS coordinate_counts_by_graph_${granularity}
    (
      target UUID CODEC(ZSTD(1)),
      graph_id UUID CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      coordinate String CODEC(ZSTD(1)),
      hash FixedString(16) CODEC(ZSTD(1)),
      total ${pickUInt(granularity)} CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, coordinate, hash)
    ORDER BY (target, graph_id, coordinate, hash, timestamp)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  // Number of errors per coordinate and error code.
  await exec(`
    CREATE TABLE IF NOT EXISTS coordinate_errors_by_graph_${granularity}
    (
      target UUID CODEC(ZSTD(1)),
      graph_id UUID CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      coordinate String CODEC(ZSTD(1)),
      code LowCardinality(String) CODEC(ZSTD(1)),
      hash FixedString(16) CODEC(ZSTD(1)),
      total_errors ${pickUInt(granularity)} CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, coordinate, code)
    ORDER BY (target, graph_id, coordinate, code, timestamp, hash)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);
};

/** Minutely rollups, aggregated from the source inserts. */
const createMinutelyViews = async (exec: (query: string) => Promise<void>) => {
  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS coordinates_by_graph_minutely_mv TO coordinates_by_graph_minutely
    AS (
      SELECT
        toUUID(target) AS target,
        graph_id,
        toStartOfMinute(timestamp) AS timestamp,
        coordinate,
        unhex(hash) AS hash,
        CAST(sum(total) AS UInt32) AS total
      FROM operation_collection
      ARRAY JOIN coordinates AS coordinate
      GROUP BY target, graph_id, timestamp, coordinate, hash
    )
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS coordinate_counts_by_graph_minutely_mv TO coordinate_counts_by_graph_minutely
    AS (
      SELECT
        toUUID(target) AS target,
        graph_id,
        toStartOfMinute(timestamp) AS timestamp,
        coord_total.1 AS coordinate,
        unhex(hash) AS hash,
        CAST(sum(coord_total.2) AS UInt32) AS total
      FROM operations
      ARRAY JOIN coordinate_totals AS coord_total
      GROUP BY target, graph_id, timestamp, coordinate, hash
    )
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS coordinate_errors_by_graph_minutely_mv TO coordinate_errors_by_graph_minutely
    AS (
      SELECT
        target,
        graph_id,
        toStartOfMinute(timestamp) AS timestamp,
        error.path AS coordinate,
        error.code AS code,
        hash,
        CAST(count() AS UInt32) AS total_errors
      FROM operation_errors
      ARRAY JOIN errors AS error
      GROUP BY target, graph_id, timestamp, coordinate, code, hash
    )
  `);
};

/** Hourly/daily rollups, cascaded from the next finer granularity. */
const createCascadingViews = async (
  exec: (query: string) => Promise<void>,
  granularity: Exclude<Granularity, 'minutely'>,
  from: Exclude<Granularity, 'daily'>,
  bucket: 'toStartOfHour' | 'toStartOfDay',
) => {
  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS coordinates_by_graph_${granularity}_mv TO coordinates_by_graph_${granularity}
    AS (
      SELECT
        target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        coordinate,
        hash,
        CAST(sum(total) AS ${pickUInt(granularity)}) AS total
      FROM coordinates_by_graph_${from}
      GROUP BY target, graph_id, timestamp, coordinate, hash
    )
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS coordinate_counts_by_graph_${granularity}_mv TO coordinate_counts_by_graph_${granularity}
    AS (
      SELECT
        target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        coordinate,
        hash,
        CAST(sum(total) AS ${pickUInt(granularity)}) AS total
      FROM coordinate_counts_by_graph_${from}
      GROUP BY target, graph_id, timestamp, coordinate, hash
    )
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS coordinate_errors_by_graph_${granularity}_mv TO coordinate_errors_by_graph_${granularity}
    AS (
      SELECT
        target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        coordinate,
        code,
        hash,
        CAST(sum(total_errors) AS ${pickUInt(granularity)}) AS total_errors
      FROM coordinate_errors_by_graph_${from}
      GROUP BY target, graph_id, timestamp, coordinate, code, hash
    )
  `);
};

export const action: Action = async exec => {
  await createTables(exec, 'minutely', 'toStartOfHour(timestamp)', '24 HOUR');
  await createTables(exec, 'hourly', 'toYYYYMMDD(timestamp)', '30 DAY');
  await createTables(exec, 'daily', 'toYYYYMM(timestamp)', '1 YEAR');

  // Create the views top-down (daily, hourly, minutely), so every downstream view already exists
  // when its source starts receiving inserts.
  await createCascadingViews(exec, 'daily', 'hourly', 'toStartOfDay');
  await createCascadingViews(exec, 'hourly', 'minutely', 'toStartOfHour');
  await createMinutelyViews(exec);
};
