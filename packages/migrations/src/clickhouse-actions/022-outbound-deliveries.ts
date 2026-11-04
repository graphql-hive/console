import type { Action } from '../clickhouse';

/**
 * One row per attempt to deliver an outbound notification (schema change, metric alert, channel
 * confirmation) to an alert channel, written by the API. Read per destination by the alert channel
 * page: bucketed totals, the latest outcome, and recent attempts with what was sent.
 *
 * Volume is a few hundred rows a day, so the layout favours query shape over storage: monthly
 * partitions keep the longest page range inside two or three partitions, and the TTL leaves a
 * margin over it so that range is always complete.
 */
export const action: Action = async exec => {
  await exec(`
    CREATE TABLE IF NOT EXISTS "outbound_deliveries" (
      "timestamp" DateTime('UTC') CODEC(DoubleDelta, LZ4),
      "organization_id" UUID CODEC(ZSTD(1)),
      -- SLACK | WEBHOOK | MSTEAMS_WEBHOOK | DISCORD
      "delivery_type" LowCardinality(String) CODEC(ZSTD(1)),
      -- where it went: the alert channel id
      "destination" String CODEC(ZSTD(1)),
      -- schema_change | metric_alert | channel_confirmation
      "event" LowCardinality(String) CODEC(ZSTD(1)),
      -- graphile-worker attempt number; always 1 for attempts made by the API
      "attempt" UInt8 CODEC(T64, ZSTD(1)),
      -- the retry budget of the job that made the attempt; 1 for attempts made by the API
      "max_attempts" UInt8 CODEC(T64, ZSTD(1)),
      "ok" UInt8 CODEC(T64, ZSTD(1)),
      -- what the destination answered: the HTTP status, or an SMTP reply code; 0 when nothing did
      "status_code" UInt16 CODEC(T64, ZSTD(1)),
      -- reason phrase, Slack API result code, or "<error code>: <message>" when nothing answered
      "status_text" String CODEC(ZSTD(1)),
      "duration_ms" UInt32 CODEC(T64, ZSTD(1)),
      -- what Hive sent to identify the call: the request headers, or the Slack message metadata
      "metadata" Map(LowCardinality(String), String) CODEC(ZSTD(1))
    )
    ENGINE = MergeTree
    PARTITION BY toYYYYMM("timestamp")
    ORDER BY ("organization_id", "delivery_type", "destination", "timestamp")
    TTL "timestamp" + INTERVAL 75 DAY
    SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;
  `);
};
