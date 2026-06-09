import type { Action } from '../clickhouse';

// Target-keyed rollups for the metric-alert evaluator. The existing
// `operations_minutely` / `operations_hourly` tables are ordered
// `(target, hash, client_name, client_version, timestamp)`, so an unfiltered
// alert window query (sum across all hashes/clients for a target over a time
// range) can't use timestamp for index/partition pruning...`operations_minutely`
// in particular is `PARTITION BY tuple()`, so a 5-minute alert scans the
// target's whole 24h slice.
//
// These two views re-aggregate the same source (`default.operations`) keyed on
// `(target, timestamp)` only, day-partitioned, so the same window query reads
// just the window's granules. The alert evaluator routes unfiltered rules here;
// filtered rules keep using the existing tables (where the hash/client predicate
// already exploits the sort-key prefix).
//
// The SELECTs intentionally mirror `createSelectStatementForOperationsMinutely`
// / `...Hourly` in 004-version-2 (same aggregate-state functions) minus the
// hash/client dimensions, so `avgMerge` / `quantilesMerge` at read time stay
// correct.
const createByTargetSelect = (bucket: 'toStartOfMinute' | 'toStartOfHour') => `
  SELECT
    target,
    ${bucket}(timestamp) AS timestamp,
    count() AS total,
    sum(ok) AS total_ok,
    avgState(duration) AS duration_avg,
    quantilesState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
  FROM default.operations
  GROUP BY
    target,
    timestamp
`;

export const action: Action = async exec => {
  // No historical backfill (start-fresh): the views capture inserts going
  // forward, starting the moment they're created.
  await Promise.all([
    exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_minutely_by_target
      (
        target LowCardinality(String) CODEC(ZSTD(1)),
        timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
        total UInt32 CODEC(T64, ZSTD(1)),
        total_ok UInt32 CODEC(T64, ZSTD(1)),
        duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
        duration_quantiles AggregateFunction(quantiles(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
      )
      ENGINE = SummingMergeTree
      PARTITION BY toYYYYMMDD(timestamp)
      PRIMARY KEY (target, timestamp)
      ORDER BY (target, timestamp)
      TTL timestamp + INTERVAL 24 HOUR
      SETTINGS index_granularity = 8192 AS
      ${createByTargetSelect('toStartOfMinute')}
    `),
    exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_hourly_by_target
      (
        target LowCardinality(String) CODEC(ZSTD(1)),
        timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
        total UInt32 CODEC(T64, ZSTD(1)),
        total_ok UInt32 CODEC(T64, ZSTD(1)),
        duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
        duration_quantiles AggregateFunction(quantiles(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
      )
      ENGINE = SummingMergeTree
      PARTITION BY toYYYYMMDD(timestamp)
      PRIMARY KEY (target, timestamp)
      ORDER BY (target, timestamp)
      TTL timestamp + INTERVAL 30 DAY
      SETTINGS index_granularity = 8192 AS
      ${createByTargetSelect('toStartOfHour')}
    `),
  ]);
};
