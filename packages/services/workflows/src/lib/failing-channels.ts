import { formatDateTime, sql, type SqlStatement } from '@hive/clickhouse';

/**
 * A channel is failing once this many attempts in a row, the most recent ones, have failed.
 * Must match `FAILURE_STREAK_LENGTH` in the API's `modules/deliveries/providers/delivery-reader.ts`,
 * which is what the channel page shows.
 */
export const FAILURE_STREAK_LENGTH = 10;
/** The web app's `CHANNEL_DISABLE_GRACE_HOURS` (`channel-health-warning.tsx`) promises this. */
export const DISABLE_AFTER_FAILING_HOURS = 48;
/** The TTL of `outbound_deliveries` (ClickHouse migration 022). */
export const DELIVERY_RETENTION_DAYS = 75;

const HOUR_MS = 60 * 60 * 1000;

/** Channels failing since this moment or earlier are disabled. */
export function disableCutoff(now: Date): Date {
  return new Date(now.getTime() - DISABLE_AFTER_FAILING_HOURS * HOUR_MS);
}

/** Nothing older than this is still in `outbound_deliveries`. */
export function retentionFloor(now: Date): Date {
  return new Date(now.getTime() - DELIVERY_RETENTION_DAYS * 24 * HOUR_MS);
}

/**
 * The channels that may have been failing for 48 hours, from the per-channel state rollup
 * (`alert_channel_delivery_state`, ClickHouse migration 025): the last failure is newer than the
 * last success, that success (epoch 0 when there was none) is older than the cutoff, and the
 * last failure is still within retention. Necessary conditions only, over one row per channel;
 * `channelFailuresStatement` decides. A key's rows may not be merged yet, hence GROUP BY and max.
 */
export function candidateChannelsStatement(input: {
  cutoff: Date;
  retentionFloor: Date;
}): SqlStatement {
  return sql`
    SELECT "organization_id", "delivery_type", "destination"
    FROM "alert_channel_delivery_state"
    GROUP BY "organization_id", "delivery_type", "destination"
    HAVING max("last_failure_at") > max("last_success_at")
      AND max("last_success_at") <= toDateTime(${formatDateTime(input.cutoff)}, 'UTC')
      AND max("last_failure_at") >= toDateTime(${formatDateTime(input.retentionFloor)}, 'UTC')
  `;
}

/**
 * How many attempts to one channel failed after its last success, counting from `since` (when
 * the channel was last enabled), and when the first of them was made. Both lookups walk the
 * table's primary key. At least `FAILURE_STREAK_LENGTH` of them means the ten most recent
 * attempts all failed, which is the channel page's FAILING, and the first of them is its
 * failingSince. No success since `since` leaves `last_success_ts` at epoch 0, so every failure
 * counts, as on the page.
 */
export function channelFailuresStatement(input: {
  organizationId: string;
  deliveryType: string;
  destination: string;
  since: Date;
}): SqlStatement {
  const scope = sql`
    "organization_id" = ${input.organizationId}
    AND "delivery_type" = ${input.deliveryType}
    AND "destination" = ${input.destination}
    AND "timestamp" >= toDateTime(${formatDateTime(input.since)}, 'UTC')
  `;
  return sql`
    WITH (
      SELECT max("timestamp")
      FROM "outbound_deliveries"
      WHERE ${scope} AND "ok" = 1
    ) AS last_success_ts
    SELECT count() AS failures, toUnixTimestamp(min("timestamp")) AS failing_since
    FROM "outbound_deliveries"
    WHERE ${scope} AND "ok" = 0 AND "timestamp" > last_success_ts
  `;
}

/**
 * The rule the sweep applies to one channel: at least ten failed attempts after the last
 * success, the first of them 48 hours ago or more. `failingSince` is null when nothing failed.
 */
export function shouldDisable(input: {
  failures: number;
  failingSince: Date | null;
  now: Date;
}): boolean {
  if (input.failures < FAILURE_STREAK_LENGTH || input.failingSince === null) {
    return false;
  }
  return input.failingSince.getTime() <= disableCutoff(input.now).getTime();
}
