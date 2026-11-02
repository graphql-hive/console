import type { Action } from '../clickhouse';

/**
 * One row per attempt to deliver an alert-channel notification (schema change, metric alert,
 * channel confirmation), written by the API and the workflows service. Read per channel by the
 * alert channel page: bucketed totals, the latest outcome, and recent attempts with what was sent.
 *
 * Volume is a few hundred rows a day, so the layout favours query shape over storage: monthly
 * partitions keep the longest page range (60 days) inside two or three partitions, and the TTL
 * leaves a margin over it so that range is always complete.
 */
export const action: Action = async exec => {
  await exec(`
    CREATE TABLE IF NOT EXISTS "alert_channel_deliveries" (
      "timestamp" DateTime('UTC') CODEC(DoubleDelta, LZ4),
      "organization_id" LowCardinality(String) CODEC(ZSTD(1)),
      "project_id" LowCardinality(String) CODEC(ZSTD(1)),
      "channel_id" LowCardinality(String) CODEC(ZSTD(1)),
      -- SLACK | WEBHOOK | MSTEAMS_WEBHOOK | DISCORD
      "channel_type" LowCardinality(String) CODEC(ZSTD(1)),
      -- schema_change | metric_alert | channel_confirmation
      "event" LowCardinality(String) CODEC(ZSTD(1)),
      -- graphile-worker attempt number; always 1 for attempts made by the API
      "attempt" UInt8 CODEC(T64, ZSTD(1)),
      "ok" UInt8 CODEC(T64, ZSTD(1)),
      -- HTTP status of the response; 0 when there was none
      "status_code" UInt16 CODEC(T64, ZSTD(1)),
      -- reason phrase, Slack API result code, or "<error code>: <message>" when nothing answered
      "status_text" String CODEC(ZSTD(1)),
      "duration_ms" UInt32 CODEC(T64, ZSTD(1)),
      -- what Hive sent to identify the call: the request headers, or the Slack message metadata
      "metadata" Map(LowCardinality(String), String) CODEC(ZSTD(1))
    )
    ENGINE = MergeTree
    PARTITION BY toYYYYMM("timestamp")
    ORDER BY ("project_id", "channel_id", "timestamp")
    TTL "timestamp" + INTERVAL 75 DAY
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
  `);
};
