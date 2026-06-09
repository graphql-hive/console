import type { Action } from '../clickhouse';

// Target-keyed rollups for the metric-alert evaluator. The existing
// `operations_minutely` / `operations_hourly` tables are ordered
// `(target, hash, client_name, client_version, timestamp)`, so an unfiltered
// alert window query (sum across all hashes/clients for a target over a time
// range) can't use timestamp for index/partition pruning...`operations_minutely`
// in particular is `PARTITION BY tuple()`, so a 5-minute alert scans the
// target's whole 24h slice.
//
// These rollups re-aggregate the same source (`default.operations`) keyed on
// `(target, timestamp)` only and time-partitioned, so the same window query reads
// just the window's granules. The alert evaluator routes unfiltered rules here;
// filtered rules keep using the existing tables (where the hash/client predicate
// already exploits the sort-key prefix).
//
// Each rollup is a data table + a separate `TO`-table materialized view (the
// `_mv` suffix), rather than the combined `CREATE MATERIALIZED VIEW ... AS` form
// the older operations_* tables use. Splitting them lets the view and the table
// be migrated independently.

// Data table columns, with storage codecs. Percentiles use `quantilesTDigest`
// rather than the older `quantiles` the legacy operations_* rollups use:
// t-digest is deterministic and more accurate in the tails (what P95/P99 latency
// alerting needs) and merges better across the MV's partial states. The reader
// must match it with `quantilesTDigestMerge` (see `queryClickHouseWindows`).
const tableColumns = `
  target LowCardinality(String) CODEC(ZSTD(1)),
  timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
  total UInt32 CODEC(T64, ZSTD(1)),
  total_ok UInt32 CODEC(T64, ZSTD(1)),
  duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
  duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
`;

// Same columns as the data table, types only — the MV's output projection.
const mvColumns = `
  target LowCardinality(String),
  timestamp DateTime('UTC'),
  total UInt32,
  total_ok UInt32,
  duration_avg AggregateFunction(avg, UInt64),
  duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64)
`;

const selectByTarget = (bucket: 'toStartOfMinute' | 'toStartOfHour') => `
  SELECT
    target,
    ${bucket}(timestamp) AS timestamp,
    count() AS total,
    sum(ok) AS total_ok,
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
    (
      ${mvColumns}
    )
    AS (
      ${selectByTarget(bucket)}
    )
  `);
};

export const action: Action = async exec => {
  // No historical backfill (start-fresh): the views capture inserts going
  // forward, starting the moment they're created.
  //
  // Partition granularity is matched to each TTL, and `ttl_only_drop_parts = 1`
  // (set in createRollup) makes cleanup drop whole expired partitions instead of
  // rewriting parts to strip rows: the 24h minutely rollup partitions by hour
  // (~25 partitions, one ages out each hour), the 30-day hourly rollup by day
  // (~31 partitions, one ages out each day, same as operations_hourly).
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
