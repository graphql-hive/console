import type { Action } from '../clickhouse';

type Granularity = 'daily' | 'hourly' | 'minutely';

const pickUInt = (aggregation: Granularity) => (aggregation === 'daily' ? 'UInt64' : 'UInt32');

/**
 * Graph-aware counterparts of the schema coordinate rollups used by the explorer and insights:
 *
 * - `coordinates_by_graph_<granularity>` replaces `coordinates_*` (fed from `operation_collection`)
 * - `coordinate_counts_by_graph_<granularity>` replaces `coordinate_counts_*` (fed from `operations`)
 * - `coordinate_errors_by_graph_<granularity>` replaces `coordinate_errors_*` (fed from `operation_errors`)
 *
 * Like the `operations_by_graph_*` rollups (027), every granularity is aggregated directly from the
 * source insert (no minutely -> hourly -> daily cascade), each materialized view writes `TO` a
 * separately created destination table, and retention is a fixed TTL on time-based partitions.
 *
 * The `hash` column keeps the type of the legacy table it replaces (`String` for `coordinates`,
 * raw md5 `FixedString(16)` for `coordinate_counts` and `coordinate_errors`), so the reader can
 * switch tables without changing its hash handling.
 */
const createRollups = async (
  exec: (query: string) => Promise<void>,
  granularity: Granularity,
  bucket: 'toStartOfMinute' | 'toStartOfHour' | 'toStartOfDay',
  partitionBy: string,
  ttlInterval: string,
) => {
  const coordinates = `coordinates_by_graph_${granularity}`;
  const coordinateCounts = `coordinate_counts_by_graph_${granularity}`;
  const coordinateErrors = `coordinate_errors_by_graph_${granularity}`;

  // Number of requests per operation document using a coordinate.
  await exec(`
    CREATE TABLE IF NOT EXISTS ${coordinates}
    (
      target UUID CODEC(ZSTD(1)),
      graph_id UUID CODEC(ZSTD(1)),
      timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
      coordinate String CODEC(ZSTD(1)),
      hash String CODEC(ZSTD(1)),
      total ${pickUInt(granularity)} CODEC(T64, ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY ${partitionBy}
    PRIMARY KEY (target, graph_id, coordinate, hash)
    ORDER BY (target, graph_id, coordinate, hash, timestamp)
    TTL timestamp + INTERVAL ${ttlInterval}
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${coordinates}_mv TO ${coordinates}
    AS (
      SELECT
        toUUID(target) AS target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        coordinate,
        hash,
        CAST(sum(total) AS ${pickUInt(granularity)}) AS total
      FROM operation_collection
      ARRAY JOIN coordinates AS coordinate
      GROUP BY target, graph_id, timestamp, coordinate, hash
    )
  `);

  // Number of times a coordinate was resolved.
  await exec(`
    CREATE TABLE IF NOT EXISTS ${coordinateCounts}
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

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${coordinateCounts}_mv TO ${coordinateCounts}
    AS (
      SELECT
        toUUID(target) AS target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        coord_total.1 AS coordinate,
        unhex(hash) AS hash,
        CAST(sum(coord_total.2) AS ${pickUInt(granularity)}) AS total
      FROM operations
      ARRAY JOIN coordinate_totals AS coord_total
      GROUP BY target, graph_id, timestamp, coordinate, hash
    )
  `);

  // Number of errors per coordinate and error code.
  await exec(`
    CREATE TABLE IF NOT EXISTS ${coordinateErrors}
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

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${coordinateErrors}_mv TO ${coordinateErrors}
    AS (
      SELECT
        target,
        graph_id,
        ${bucket}(timestamp) AS timestamp,
        error.path AS coordinate,
        error.code AS code,
        hash,
        CAST(count() AS ${pickUInt(granularity)}) AS total_errors
      FROM operation_errors
      ARRAY JOIN errors AS error
      GROUP BY target, graph_id, timestamp, coordinate, code, hash
    )
  `);
};

export const action: Action = async exec => {
  await createRollups(exec, 'minutely', 'toStartOfMinute', 'toStartOfHour(timestamp)', '24 HOUR');
  await createRollups(exec, 'hourly', 'toStartOfHour', 'toYYYYMMDD(timestamp)', '30 DAY');
  await createRollups(exec, 'daily', 'toStartOfDay', 'toYYYYMM(timestamp)', '1 YEAR');
};
