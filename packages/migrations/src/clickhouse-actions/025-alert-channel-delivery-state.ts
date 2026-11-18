import type { Action } from '../clickhouse';

/**
 * One row per alert channel that was ever sent anything: when its last attempt succeeded and
 * when its last attempt failed, kept up to date by a materialized view on
 * `outbound_deliveries`. Read only by the workflows service's hourly sweep, which uses it to
 * pick the channels that may have been failing for 48 hours and then checks each of those
 * against `outbound_deliveries` by primary key. EMAIL rows are left out: the sweep is for
 * integrations only.
 *
 * Merges are lazy, so a key can have more than one row until the parts merge; readers group by
 * the key and take `max`. A row expires 75 days after the channel's last attempt, when
 * `outbound_deliveries` (same retention) has nothing left about it either; that is also how the
 * rows of deleted channels go, whether deleted on their own or with their project. No partition:
 * a row per channel is tiny. Epoch 0 stands for "never" rather than a Nullable column.
 */
const selectState = `
  SELECT
    "organization_id"
    , "delivery_type"
    , "destination"
    , max(if("ok" = 1, "timestamp", toDateTime(0, 'UTC'))) AS last_success_at
    , max(if("ok" = 0, "timestamp", toDateTime(0, 'UTC'))) AS last_failure_at
  FROM "outbound_deliveries"
  WHERE "delivery_type" != 'EMAIL'
  GROUP BY "organization_id", "delivery_type", "destination"
`;

export const action: Action = async exec => {
  await exec(`
    CREATE TABLE IF NOT EXISTS "alert_channel_delivery_state" (
      "organization_id" UUID CODEC(ZSTD(1)),
      -- an alert channel type (SLACK | WEBHOOK | MSTEAMS_WEBHOOK | DISCORD)
      "delivery_type" LowCardinality(String) CODEC(ZSTD(1)),
      -- the alert channel id, as outbound_deliveries stores it
      "destination" String CODEC(ZSTD(1)),
      -- epoch 0 until the first success / failure
      "last_success_at" SimpleAggregateFunction(max, DateTime('UTC')) CODEC(ZSTD(1)),
      "last_failure_at" SimpleAggregateFunction(max, DateTime('UTC')) CODEC(ZSTD(1))
    )
    ENGINE = AggregatingMergeTree
    ORDER BY ("organization_id", "delivery_type", "destination")
    TTL greatest("last_success_at", "last_failure_at") + INTERVAL 75 DAY
    SETTINGS index_granularity = 8192;
  `);

  // The GROUP BY is the target's ORDER BY: that is what AggregatingMergeTree merges on.
  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS "alert_channel_delivery_state_mv"
    TO "alert_channel_delivery_state"
    AS (${selectState});
  `);

  // Backfill from what is already recorded. `max` makes this idempotent, so rows the view
  // handled between its creation and this insert do no harm, and the source is small enough
  // to do inline on every environment.
  await exec(`
    INSERT INTO "alert_channel_delivery_state"
    ${selectState}
  `);
};
