import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  // Base tables as created by otel-exporter clickhouse
  await exec(`
    CREATE TABLE IF NOT EXISTS "otel_traces" (
      "Timestamp" DateTime64(9) CODEC(Delta(8), ZSTD(1))
      , "TraceId" String CODEC(ZSTD(1))
      , "SpanId" String CODEC(ZSTD(1))
      , "ParentSpanId" String CODEC(ZSTD(1))
      , "TraceState" String CODEC(ZSTD(1))
      , "SpanName" LowCardinality(String) CODEC(ZSTD(1))
      , "SpanKind" LowCardinality(String) CODEC(ZSTD(1))
      , "ServiceName" LowCardinality(String) CODEC(ZSTD(1))
      , "ResourceAttributes" Map(LowCardinality(String), String) CODEC(ZSTD(1))
      , "ScopeName" String CODEC(ZSTD(1))
      , "ScopeVersion" String CODEC(ZSTD(1))
      , "SpanAttributes" Map(LowCardinality(String), String) CODEC(ZSTD(1))
      , "Duration" UInt64 CODEC(ZSTD(1))
      , "StatusCode" LowCardinality(String) CODEC(ZSTD(1))
      , "StatusMessage" String CODEC(ZSTD(1))
      , "Events.Timestamp" Array(DateTime64(9)) CODEC(ZSTD(1))
      , "Events.Name" Array(LowCardinality(String)) CODEC(ZSTD(1))
      , "Events.Attributes" Array(Map(LowCardinality(String), String)) CODEC(ZSTD(1))
      , "Links.TraceId" Array(String) CODEC(ZSTD(1))
      , "Links.SpanId" Array(String) CODEC(ZSTD(1))
      , "Links.TraceState" Array(String) CODEC(ZSTD(1))
      , "Links.Attributes" Array(Map(LowCardinality(String), String)) CODEC(ZSTD(1))
      , INDEX "idx_trace_id" "TraceId" TYPE bloom_filter(0.001) GRANULARITY 1
      , INDEX "idx_res_attr_key" mapKeys("ResourceAttributes") TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_res_attr_value" mapValues("ResourceAttributes") TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_span_attr_key" mapKeys("SpanAttributes") TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_span_attr_value" mapValues("SpanAttributes") TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_duration" Duration TYPE minmax GRANULARITY 1
    )
    ENGINE = MergeTree
    PARTITION BY toDate("Timestamp")
    ORDER BY (
      "ServiceName"
      , "SpanName"
      , toDateTime("Timestamp")
    )
    TTL toDate("Timestamp") + toIntervalDay(365)
    SETTINGS
     index_granularity = 8192
     , ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS "otel_traces_trace_id_ts" (
      "TraceId" String CODEC(ZSTD(1))
      , "Start" DateTime CODEC(Delta(4), ZSTD(1))
      , "End" DateTime CODEC(Delta(4), ZSTD(1))
      , INDEX "idx_trace_id" "TraceId" TYPE bloom_filter(0.01) GRANULARITY 1
    )
    ENGINE = MergeTree
    PARTITION BY toDate(Start)
    ORDER BY (
      "TraceId"
      , "Start"
    )
    TTL toDate("Start") + toIntervalDay(365)
    SETTINGS
     index_granularity = 8192
     , ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS "otel_traces_trace_id_ts_mv" TO "otel_traces_trace_id_ts" (
      "TraceId" String
      , "Start" DateTime64(9)
      , "End" DateTime64(9)
    )
    AS (
      SELECT
        "TraceId"
        , min("Timestamp") AS "Start"
        , max("Timestamp") AS "End"
      FROM
        "otel_traces"
      WHERE
        "TraceId" != ''
      GROUP BY
        "TraceId"
    )
  `);

  // Our own custom materialized views based on the base tables
  await exec(`
    CREATE TABLE IF NOT EXISTS "otel_traces_normalized" (
      "target_id" LowCardinality(String) CODEC(ZSTD(1))
      , "trace_id" String CODEC(ZSTD(1))
      , "span_id" String CODEC(ZSTD(1))
      , "timestamp" DateTime('UTC') CODEC(DoubleDelta, LZ4)
      , "duration" UInt64 CODEC(T64, ZSTD(1))
      , "http_status_code" String CODEC(ZSTD(1))
      , "http_method" String CODEC(ZSTD(1))
      , "http_host" String CODEC(ZSTD(1))
      , "http_route" String CODEC(ZSTD(1))
      , "http_url" String CODEC(ZSTD(1))
      , "client_name" String Codec(ZSTD(1))
      , "client_version" String Codec(ZSTD(1))
      , "graphql_operation_name" String CODEC(ZSTD(1))
      , "graphql_operation_type" LowCardinality(String) CODEC(ZSTD(1))
      , "graphql_operation_document" String CODEC(ZSTD(1))
      , "graphql_error_count" UInt32 CODEC(T64, ZSTD(1))
      , "graphql_error_codes" Array(LowCardinality(String)) CODEC(ZSTD(1))
      , "subgraph_names" Array(LowCardinality(String)) CODEC(ZSTD(1))
      , INDEX "idx_duration" "duration" TYPE minmax GRANULARITY 1
      , INDEX "idx_http_status_code" "http_status_code" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_http_method" "http_method" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_http_host" "http_host" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_http_route" "http_route" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_http_url" "http_url" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_client_name" "client_name" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_client_version" "client_version" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_graphql_operation_name" "graphql_operation_name" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_graphql_operation_type" "graphql_operation_type" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_graphql_error_codes" "graphql_error_codes" TYPE bloom_filter(0.01) GRANULARITY 1
      , INDEX "idx_subgraph_names" "subgraph_names" TYPE bloom_filter(0.01) GRANULARITY 1
    )
    ENGINE = MergeTree
    PARTITION BY toDate("timestamp")
    ORDER BY ("target_id", "timestamp")
    TTL toDateTime(timestamp) + toIntervalDay(365)
    SETTINGS
      index_granularity = 8192
      , ttl_only_drop_parts = 1
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS "otel_traces_normalized_mv" TO "otel_traces_normalized" (
      "target_id" LowCardinality(String)
      , "trace_id" String
      , "span_id" String
      , "timestamp" DateTime('UTC')
      , "duration" UInt64
      , "http_status_code" String
      , "http_host" String
      , "http_method" String
      , "http_route" String
      , "http_url" String
      , "client_name" String
      , "client_version" String
      , "graphql_operation_name" String
      , "graphql_operation_type" LowCardinality(String)
      , "graphql_operation_document" String
      , "graphql_error_count" UInt32
      , "graphql_error_codes" Array(LowCardinality(String))
      , "subgraph_names" Array(String)
    )
    AS (
      SELECT
        toLowCardinality("SpanAttributes"['hive.target_id']) AS "target_id"
        , "TraceId" as "trace_id"
        , "SpanId" AS "span_id"
        , toDateTime("Timestamp", 'UTC') AS "timestamp"
        , "Duration" AS "duration"
        , "SpanAttributes"['http.status_code'] AS "http_status_code"
        , "SpanAttributes"['http.host'] AS "http_host"
        , "SpanAttributes"['http.method'] AS "http_method"
        , "SpanAttributes"['http.route'] AS "http_route"
        , "SpanAttributes"['http.url'] AS "http_url"
        , "SpanAttributes"['hive.client.name'] AS "client_name"
        , "SpanAttributes"['hive.client.version'] AS "client_version"
        , "SpanAttributes"['hive.graphql.operation.name'] AS "graphql_operation_name"
        , toLowCardinality("SpanAttributes"['hive.graphql.operation.type']) AS "graphql_operation_type"
        , "SpanAttributes"['hive.graphql.operation.document'] AS "graphql_operation_document"
        , "SpanAttributes"['hive.graphql.error.count'] AS "graphql_errors_count"
        , arrayMap(x -> toLowCardinality(x), splitByChar(',', "SpanAttributes"['hive.graphql.error.codes'])) AS "graphql_error_codes"
        , arrayMap(x -> toLowCardinality(x), splitByChar(',', "SpanAttributes"['hive.subgraph.names'])) AS "subgraph_names"
      FROM
        "otel_traces"
      WHERE
        empty("ParentSpanId")
    )
  `);
};
