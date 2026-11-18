import type { Action } from '../clickhouse';

type Granularity = 'daily' | 'hourly' | 'minutely';

const pickUInt = (aggregation: Granularity) => (aggregation === 'minutely' ? 'UInt32' : 'UInt64');

const aggregateColumns = (granularity: Granularity) => `
  total ${pickUInt(granularity)} CODEC(T64, ZSTD(1)),
  total_ok ${pickUInt(granularity)} CODEC(T64, ZSTD(1)),
  duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
  duration_quantiles AggregateFunction(quantilesTDigest(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
`;

/** Aggregate states built from the raw `operations` rows. */
const aggregateStatesFromSource = (granularity: Granularity) => `
  CAST(count() AS ${pickUInt(granularity)}) AS total,
  CAST(sum(ok) AS ${pickUInt(granularity)}) AS total_ok,
  avgState(duration) AS duration_avg,
  quantilesTDigestState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
`;

/** Aggregate states merged from the rollup of the next finer granularity. */
const aggregateStatesFromRollup = (granularity: Granularity) => `
  CAST(sum(total) AS ${pickUInt(granularity)}) AS total,
  CAST(sum(total_ok) AS ${pickUInt(granularity)}) AS total_ok,
  avgMergeState(duration_avg) AS duration_avg,
  quantilesTDigestMergeState(0.75, 0.9, 0.95, 0.99)(duration_quantiles) AS duration_quantiles
`;

type Rollup = {
  /** Table name for a granularity, `operations_by_graph[_<dimensions>]_<granularity>`. */
  table: (granularity: Granularity) => string;
  /** Dimension columns besides `target`, `graph_id` and `timestamp`. */
  dimensions: string[];
  /** Column definitions of the dimensions. */
  dimensionColumns: string;
};

// The granularity goes last in the table name, like the existing rollups (`operations_daily`, `clients_hourly`).
const rollups: Rollup[] = [
  {
    table: granularity => `operations_by_graph_hash_client_${granularity}`,
    dimensions: ['hash', 'client_name', 'client_version'],
    dimensionColumns: `
      hash FixedString(16) CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
    `,
  },
  {
    table: granularity => `operations_by_graph_${granularity}`,
    dimensions: [],
    dimensionColumns: '',
  },
  {
    table: granularity => `operations_by_graph_client_${granularity}`,
    dimensions: ['client_name', 'client_version'],
    dimensionColumns: `
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
    `,
  },
];

/**
 * Graph-aware rollups of `operations`, named `operations_by_graph[_<dimensions>]_<granularity>`.
 *
 * Only the minutely rollups are aggregated from the `operations` insert. The hourly rollups cascade
 * from the minutely ones and the daily rollups from the hourly ones (minutely -> hourly -> daily),
 * merging the aggregate states instead of re-aggregating the raw rows for every granularity. Each
 * materialized view writes `TO` a separately created destination table, and retention is a fixed TTL
 * on time-based partitions.
 *
 * `hash` is stored as the raw md5 (`FixedString(16)`, `unhex` of the md5 hex `operations.hash`), like
 * in every `*_by_graph_*` rollup (see 028). It halves the column and makes grouping, `IN` filters and
 * joins on `hash` cheaper. Readers `unhex` hashes they filter by and `lower(hex(hash))` hashes they
 * return or join with tables storing the hex `String` (`operation_collection_*`, legacy rollups).
 */
const createTables = async (
  exec: (query: string) => Promise<void>,
  granularity: Granularity,
  partitionBy: string,
  ttlInterval: string,
) => {
  for (const rollup of rollups) {
    const key = ['target', 'graph_id', 'timestamp', ...rollup.dimensions].join(', ');
    // `operations_by_graph_hash_client_*` keeps a shorter primary key than its sorting key.
    const primaryKey = rollup.dimensions.includes('hash')
      ? 'target, graph_id, timestamp, hash'
      : key;

    await exec(`
      CREATE TABLE IF NOT EXISTS ${rollup.table(granularity)}
      (
        target UUID CODEC(ZSTD(1)),
        graph_id UUID CODEC(ZSTD(1)),
        timestamp DateTime('UTC') CODEC(DoubleDelta, LZ4),
        ${rollup.dimensionColumns}
        ${aggregateColumns(granularity)}
      )
      ENGINE = SummingMergeTree
      PARTITION BY ${partitionBy}
      PRIMARY KEY (${primaryKey})
      ORDER BY (${key})
      TTL timestamp + INTERVAL ${ttlInterval}
      SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1
    `);
  }
};

/** Minutely rollups, aggregated from the `operations` inserts. */
const createMinutelyViews = async (exec: (query: string) => Promise<void>) => {
  for (const rollup of rollups) {
    const dimensions = rollup.dimensions.map(column =>
      column === 'hash' ? 'unhex(hash) AS hash' : column,
    );

    await exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${rollup.table('minutely')}_mv TO ${rollup.table('minutely')}
      AS (
        SELECT
          toUUID(target) AS target,
          graph_id,
          toStartOfMinute(timestamp) AS timestamp,
          ${dimensions.map(column => `${column},`).join('\n')}
          ${aggregateStatesFromSource('minutely')}
        FROM operations
        GROUP BY ${['target', 'graph_id', 'timestamp', ...rollup.dimensions].join(', ')}
      )
    `);
  }
};

/** Hourly/daily rollups, cascaded from the next finer granularity. */
const createCascadingViews = async (
  exec: (query: string) => Promise<void>,
  granularity: Exclude<Granularity, 'minutely'>,
  from: Exclude<Granularity, 'daily'>,
  bucket: 'toStartOfHour' | 'toStartOfDay',
) => {
  for (const rollup of rollups) {
    await exec(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${rollup.table(granularity)}_mv TO ${rollup.table(granularity)}
      AS (
        SELECT
          target,
          graph_id,
          ${bucket}(timestamp) AS timestamp,
          ${rollup.dimensions.map(column => `${column},`).join('\n')}
          ${aggregateStatesFromRollup(granularity)}
        FROM ${rollup.table(from)}
        GROUP BY ${['target', 'graph_id', 'timestamp', ...rollup.dimensions].join(', ')}
      )
    `);
  }
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
