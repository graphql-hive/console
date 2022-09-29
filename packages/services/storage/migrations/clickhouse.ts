import { got } from 'got';

const tables = [
  // replaces operations_registry (adds coordinates, total and TTL)
  `
    CREATE TABLE IF NOT EXISTS default.operation_collection
    (
      target LowCardinality(String),
      hash String,
      name String,
      body String,
      operation_kind String,
      coordinates Array(String) CODEC(ZSTD(1)),
      total UInt32 CODEC(ZSTD(1)),
      timestamp DateTime('UTC'),
      expires_at DateTime('UTC'),
      INDEX idx_operation_kind (operation_kind) TYPE set(0) GRANULARITY 1
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, hash)
    ORDER BY (target, hash, timestamp, expires_at)
    TTL expires_at
    SETTINGS index_granularity = 8192;
  `,
  // replaces operations_new (no coordinates, less size)
  `
    CREATE TABLE IF NOT EXISTS default.operations
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC'),
      expires_at DateTime('UTC'),
      hash String CODEC(ZSTD(1)),
      ok UInt8 CODEC(ZSTD(1)),
      errors UInt16 CODEC(ZSTD(1)),
      duration UInt64 CODEC(ZSTD(1)),
      client_name LowCardinality(String) CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      INDEX idx_client_name (client_name) TYPE set(0) GRANULARITY 1,
      INDEX idx_hash (hash) TYPE set(0) GRANULARITY 1
    )
    ENGINE = MergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, hash)
    ORDER BY (target, hash, timestamp)
    TTL expires_at
    SETTINGS index_granularity = 8192
  `,
  // operations hourly
  `
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_hourly
    (
        target LowCardinality(String) CODEC(ZSTD(1)),
        timestamp DateTime('UTC'),
        expires_at DateTime('UTC'),
        hash String CODEC(ZSTD(1)),
        total UInt32 CODEC(ZSTD(1)),
        total_ok UInt32 CODEC(ZSTD(1)),
        duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
        duration_quantiles AggregateFunction(quantiles(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, hash)
    ORDER BY (target, hash, timestamp, expires_at)
    SETTINGS index_granularity = 8192 AS
    SELECT
      target,
      toStartOfHour(timestamp) AS timestamp,
      toStartOfHour(expires_at) AS expires_at,
      hash,
      count() AS total,
      sum(ok) AS total_ok,
      avgState(duration) AS duration_avg,
      quantilesState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
    FROM default.operations
    GROUP BY
      target,
      hash,
      timestamp,
      expires_at
  `,
  // operations daily
  `
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_daily
    (
        target LowCardinality(String) CODEC(ZSTD(1)),
        timestamp DateTime('UTC'),
        expires_at DateTime('UTC'),
        hash String CODEC(ZSTD(1)),
        total UInt32 CODEC(ZSTD(1)),
        total_ok UInt32 CODEC(ZSTD(1)),
        duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
        duration_quantiles AggregateFunction(quantiles(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, hash)
    ORDER BY (target, hash, timestamp, expires_at)
    TTL expires_at
    SETTINGS index_granularity = 8192 AS
    SELECT
      target,
      toStartOfDay(timestamp) AS timestamp,
      toStartOfDay(expires_at) AS expires_at,
      hash,
      count() AS total,
      sum(ok) AS total_ok,
      avgState(duration) AS duration_avg,
      quantilesState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
    FROM default.operations
    GROUP BY
      target,
      hash,
      timestamp,
      expires_at
  `,
  // replaces schema_coordinates_daily (adds ttl)
  `
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.coordinates_daily
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      hash String CODEC(ZSTD(1)), 
      timestamp DateTime('UTC'),
      expires_at DateTime('UTC'),
      total UInt32 CODEC(ZSTD(1)),
      coordinate String CODEC(ZSTD(1))
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, coordinate, hash)
    ORDER BY (target, coordinate, hash, timestamp, expires_at)
    SETTINGS index_granularity = 8192
    AS
    SELECT
      target,
      hash,
      toStartOfDay(timestamp) AS timestamp,
      toStartOfDay(expires_at) AS expires_at,
      sum(total) AS total,
      coordinate
    FROM default.operation_collection
    ARRAY JOIN coordinates as coordinate
    GROUP BY
      target,
      coordinate,
      hash,
      timestamp,
      expires_at
  `,
  // replaces client_names_daily (adds client_version and TTL)
  `
    CREATE MATERIALIZED VIEW IF NOT EXISTS default.clients_daily
    (
      target LowCardinality(String) CODEC(ZSTD(1)),
      client_name String CODEC(ZSTD(1)),
      client_version String CODEC(ZSTD(1)),
      hash String CODEC(ZSTD(1)), 
      timestamp DateTime('UTC'),
      expires_at DateTime('UTC'),
      total UInt32 CODEC(ZSTD(1)),
      INDEX idx_hash (hash) TYPE set(0) GRANULARITY 1
    )
    ENGINE = SummingMergeTree
    PARTITION BY toYYYYMMDD(timestamp)
    PRIMARY KEY (target, client_name, client_version)
    ORDER BY (target, client_name, client_version, timestamp, expires_at)
    TTL expires_at
    SETTINGS index_granularity = 8192
    AS
    SELECT
      target,
      client_name,
      client_version,
      hash,
      toStartOfDay(timestamp) AS timestamp,
      toStartOfDay(expires_at) AS expires_at,
      count() AS total
    FROM default.operations
    GROUP BY
      target,
      client_name,
      client_version,
      hash,
      timestamp,
      expires_at
  `,
];

// Legacy

const create_operations_new_query = /* SQL */ `
  CREATE TABLE IF NOT EXISTS default.operations_new
  (
    target LowCardinality(String) CODEC(ZSTD(1)),
    timestamp DateTime('UTC'),
    expires_at DateTime('UTC'),
    hash String CODEC(ZSTD(1)),
    ok UInt8 CODEC(ZSTD(1)),
    errors UInt16 CODEC(ZSTD(1)),
    duration UInt64 CODEC(ZSTD(1)),
    schema Array(String) CODEC(ZSTD(1)),
    client_name LowCardinality(String) CODEC(ZSTD(1)),
    client_version String CODEC(ZSTD(1)),
    INDEX idx_schema schema TYPE bloom_filter(0.01) GRANULARITY 3,
    INDEX idx_ok ok TYPE minmax GRANULARITY 1,
    INDEX idx_errors errors TYPE minmax GRANULARITY 1
  )
  ENGINE = MergeTree
  PARTITION BY toYYYYMMDD(timestamp)
  PRIMARY KEY (target, hash, timestamp)
  ORDER BY (target, hash, timestamp)
  TTL expires_at
  SETTINGS index_granularity = 8192
`;

const create_operations_new_hourly_mv_query = /* SQL */ `
  CREATE MATERIALIZED VIEW IF NOT EXISTS default.operations_new_hourly_mv
  (
      target LowCardinality(String) CODEC(ZSTD(1)),
      timestamp DateTime('UTC'),
      hash String CODEC(ZSTD(1)),
      total UInt32 CODEC(ZSTD(1)),
      total_ok UInt32 CODEC(ZSTD(1)),
      duration_avg AggregateFunction(avg, UInt64) CODEC(ZSTD(1)),
      duration_quantiles AggregateFunction(quantiles(0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
  )
  ENGINE = SummingMergeTree
  PARTITION BY toYYYYMMDD(timestamp)
  PRIMARY KEY (target, hash, timestamp)
  ORDER BY (target, hash, timestamp)
  SETTINGS index_granularity = 8192 AS
  SELECT
    target,
    toStartOfHour(timestamp) AS timestamp,
    hash,
    count() AS total,
    sum(ok) AS total_ok,
    avgState(duration) AS duration_avg,
    quantilesState(0.75, 0.9, 0.95, 0.99)(duration) AS duration_quantiles
  FROM default.operations_new
  GROUP BY
    target,
    hash,
    timestamp
`;

const create_operations_registry_query = /* SQL */ `
  CREATE TABLE IF NOT EXISTS default.operations_registry
  (
    target LowCardinality(String),
    hash String,
    name String,
    body String,
    operation String,
    inserted_at DateTime('UTC') DEFAULT toDateTime(0)
  )
  ENGINE = ReplacingMergeTree(inserted_at)
  PARTITION BY target
  ORDER BY (target, hash)
  SETTINGS index_granularity = 8192
`;

const create_schema_coordinates_daily_query = /* SQL */ `
  CREATE MATERIALIZED VIEW IF NOT EXISTS default.schema_coordinates_daily
  (
    target LowCardinality(String) CODEC(ZSTD(1)),
    hash String CODEC(ZSTD(1)), 
    timestamp DateTime('UTC'),
    total UInt32 CODEC(ZSTD(1)),
    coordinate String CODEC(ZSTD(1))
  )
  ENGINE = SummingMergeTree
  PARTITION BY toYYYYMMDD(timestamp)
  PRIMARY KEY (target, coordinate, hash)
  ORDER BY (target, coordinate, hash)
  SETTINGS index_granularity = 8192
  AS
  SELECT
    target,
    hash,
    toStartOfDay(timestamp) AS timestamp,
    count() AS total,
    coordinate
  FROM default.operations_new
  ARRAY JOIN schema as coordinate
  GROUP BY
    target,
    coordinate,
    hash,
    timestamp
`;

const create_client_names_daily_query = /* SQL */ `
  CREATE MATERIALIZED VIEW IF NOT EXISTS default.client_names_daily
  (
    target LowCardinality(String) CODEC(ZSTD(1)),
    client_name String CODEC(ZSTD(1)),
    hash String CODEC(ZSTD(1)), 
    timestamp DateTime('UTC'),
    total UInt32 CODEC(ZSTD(1))
  )
  ENGINE = SummingMergeTree
  PARTITION BY toYYYYMMDD(timestamp)
  PRIMARY KEY (target, client_name, hash)
  ORDER BY (target, client_name, hash)
  SETTINGS index_granularity = 8192
  AS
  SELECT
    target,
    client_name,
    hash,
    toStartOfDay(timestamp) AS timestamp,
    count() AS total
  FROM default.operations_new
  GROUP BY
    target,
    client_name,
    hash,
    timestamp
`;

export async function migrateClickHouse(
  isClickHouseMigrator: boolean,
  clickhouse: {
    protocol: string;
    host: string;
    port: number;
    username: string;
    password: string;
  }
) {
  if (isClickHouseMigrator === false) {
    console.log('Skipping ClickHouse migration');
    return;
  }

  const endpoint = `${clickhouse.protocol}://${clickhouse.host}:${clickhouse.port}`;

  console.log('Migrating ClickHouse');
  console.log('Endpoint:', endpoint);
  console.log('Username:', clickhouse.username);
  console.log('Password:', clickhouse.password.length);

  const queries = [
    create_operations_registry_query,
    create_operations_new_query,
    create_operations_new_hourly_mv_query,
    create_schema_coordinates_daily_query,
    create_client_names_daily_query,
  ].concat(tables);

  for await (const query of queries) {
    await got
      .post(endpoint, {
        body: query,
        searchParams: {
          default_format: 'JSON',
          wait_end_of_query: '1',
        },
        timeout: {
          request: 10_000,
        },
        headers: {
          Accept: 'text/plain',
        },
        username: clickhouse.username,
        password: clickhouse.password,
      })
      .catch(error => {
        const body = error?.response?.body;
        if (body) {
          console.error(body);
        }

        return Promise.reject(error);
      });
  }
}
