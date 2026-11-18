import { Injectable } from 'graphql-modules';
import { z } from 'zod';
import { formatDateTime, parseDateTime } from '@hive/clickhouse';
import type { AlertChannel, DateRange } from '../../../shared/entities';
import { toEndOfInterval, toStartOfInterval } from '../../operations/lib/date-time-helpers';
import { ClickHouse, sql } from '../../operations/providers/clickhouse-client';
import { calculateTimeWindow } from '../../operations/providers/helpers';
import { Logger } from '../../shared/providers/logger';

export const DEFAULT_DELIVERY_LOG_LIMIT = 50;
export const MAX_DELIVERY_LOG_LIMIT = 200;
/** A channel is failing once this many attempts in a row, the most recent ones, have failed. */
export const FAILURE_STREAK_LENGTH = 10;

/** What an alert channel is sent; the stored event name is the lowercase form. */
const CHANNEL_DELIVERY_EVENT_NAMES = [
  'SCHEMA_CHANGE',
  'METRIC_ALERT',
  'CHANNEL_CONFIRMATION',
] as const;
/** What an organization is emailed; the stored event name is the lowercase form. */
export const EMAIL_DELIVERY_EVENT_NAMES = [
  'ORGANIZATION_INVITATION',
  'ORGANIZATION_OWNERSHIP_TRANSFER',
  'AUDIT_LOG_EXPORT',
  'USAGE_RATE_LIMIT_WARNING',
  'USAGE_RATE_LIMIT_EXCEEDED',
] as const;
/** The GraphQL `DeliveryEvent` members. */
const DELIVERY_EVENT_NAMES = [
  ...CHANNEL_DELIVERY_EVENT_NAMES,
  ...EMAIL_DELIVERY_EVENT_NAMES,
] as const;
export type DeliveryEventName = (typeof DELIVERY_EVENT_NAMES)[number];
export type EmailDeliveryEventName = (typeof EMAIL_DELIVERY_EVENT_NAMES)[number];
export type DeliveryHealthStatus = 'UNKNOWN' | 'HEALTHY' | 'FAILING';
/** An alert channel type, or EMAIL for mail sent through the configured provider. */
export type DeliveryType = AlertChannel['type'] | 'EMAIL';

export interface DeliveryTotals {
  total: number;
  failed: number;
}

export interface DeliveryBucket {
  date: Date;
  total: number;
  failed: number;
}

export interface DeliveryHealth {
  status: DeliveryHealthStatus;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastStatusCode: number | null;
  lastStatusText: string | null;
  /** First failure after the last success; null unless FAILING. */
  failingSince: Date | null;
}

/** When a selection last succeeded and last failed. */
export type LastOutcomes = Pick<DeliveryHealth, 'lastSuccessAt' | 'lastFailureAt'>;

export interface Delivery {
  timestamp: Date;
  event: DeliveryEventName;
  /** Where it went: the alert channel id, or the recipient address as it was sent. */
  destination: string;
  /**
   * Identifies the notification across its attempts: the Idempotency-Key sent to the channel, or
   * the key the API assigned to the email. Null for an email that has none.
   */
  idempotencyKey: string | null;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  durationMs: number;
  attempt: number;
  maxAttempts: number;
  metadata: Record<string, string>;
}

/**
 * Which deliveries to read: one destination's, or every one of a type for the organization, and
 * only the given events when `events` is set (never to an empty list).
 */
export type DeliverySelector = {
  organizationId: string;
  deliveryType: DeliveryType;
  destination?: string;
  events?: readonly DeliveryEventName[];
  /** Only attempts at or after this time: a channel's health counts from when it was last enabled. */
  since?: Date;
};

// UInt64 aggregates arrive quoted (output_format_json_quote_64bit_integers); smaller integers as numbers.
const TotalsRowModel = z.object({
  total: z.coerce.number(),
  failed: z.coerce.number(),
});

const BucketRowModel = z.object({
  date: z.string(),
  total: z.coerce.number(),
  failed: z.coerce.number(),
});

const HealthRowModel = z.object({
  recent_attempts: z.coerce.number(),
  recent_failures: z.coerce.number(),
  last_success_at: z.coerce.number(),
  last_failure_at: z.coerce.number(),
  last_status_code: z.coerce.number(),
  last_status_text: z.string(),
  failing_since: z.coerce.number(),
});

const LastOutcomesRowModel = z.object({
  last_success_at: z.coerce.number(),
  last_failure_at: z.coerce.number(),
});

const LogRowModel = z.object({
  unix_timestamp: z.coerce.number(),
  event: z.string(),
  destination: z.string(),
  idempotency_key: z.string(),
  ok: z.coerce.number(),
  status_code: z.coerce.number(),
  status_text: z.string(),
  duration_ms: z.coerce.number(),
  attempt: z.coerce.number(),
  max_attempts: z.coerce.number(),
  metadata: z.record(z.string(), z.string()),
});

const DeliveryEventModel = z.enum(DELIVERY_EVENT_NAMES);

export type HealthRow = z.infer<typeof HealthRowModel>;
export type LogRow = z.infer<typeof LogRowModel>;

/** Reads `outbound_deliveries`, written by the API and workflows delivery recorders. */
@Injectable()
export class DeliveryReader {
  private logger: Logger;

  constructor(
    private clickHouse: ClickHouse,
    logger: Logger,
  ) {
    this.logger = logger.child({ source: 'DeliveryReader' });
  }

  /** The key prefix: the organization and type, then the destination and the events when given. */
  private whereSelector(selector: DeliverySelector) {
    let where = sql`"organization_id" = ${selector.organizationId} AND "delivery_type" = ${selector.deliveryType}`;
    if (selector.destination !== undefined) {
      where = sql`${where} AND "destination" = ${selector.destination}`;
    }
    if (selector.events !== undefined) {
      const events = selector.events.map(event => event.toLowerCase());
      where = sql`${where} AND "event" IN (${sql.array(events, 'String')})`;
    }
    if (selector.since !== undefined) {
      where = sql`${where} AND "timestamp" >= toDateTime(${formatDateTime(selector.since)}, 'UTC')`;
    }
    return where;
  }

  /** Attempts in the period, and how many of them the destination did not accept. */
  async getTotals(input: DeliverySelector & { period: DateRange }): Promise<DeliveryTotals> {
    this.logger.debug('Reading delivery totals (destination=%s)', input.destination ?? '*');
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT count() AS total, countIf("ok" = 0) AS failed
        FROM "outbound_deliveries"
        WHERE
          ${this.whereSelector(input)}
          AND "timestamp" >= toDateTime(${formatDateTime(input.period.from)}, 'UTC')
          AND "timestamp" <= toDateTime(${formatDateTime(input.period.to)}, 'UTC')
      `,
      queryId: 'delivery_totals',
      timeout: 10_000,
    });

    return TotalsRowModel.parse(result.data[0]);
  }

  /** Attempts per bucket over the period; `resolution` is the number of buckets (1..90). */
  async getOverTime(
    input: DeliverySelector & { period: DateRange; resolution: number },
  ): Promise<DeliveryBucket[]> {
    const interval = calculateTimeWindow({ period: input.period, resolution: input.resolution });
    const from = formatDateTime(
      toStartOfInterval(input.period.from, interval.value, interval.unit),
    );
    const to = formatDateTime(toEndOfInterval(input.period.to, interval.value, interval.unit));
    const step = String(interval.seconds);

    this.logger.debug('Reading deliveries over time (destination=%s)', input.destination ?? '*');
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          toDateTime(
            intDiv(toUnixTimestamp("timestamp"), toUInt32(${step})) * toUInt32(${step}),
            'UTC'
          ) AS date
          , count() AS total
          , countIf("ok" = 0) AS failed
        FROM "outbound_deliveries"
        WHERE
          ${this.whereSelector(input)}
          AND "timestamp" >= toDateTime(${from}, 'UTC')
          AND "timestamp" <= toDateTime(${to}, 'UTC')
        GROUP BY date
        ORDER BY date
        WITH FILL
          FROM toDateTime(${from}, 'UTC')
          TO toDateTime(${to}, 'UTC')
          STEP INTERVAL ${this.clickHouse.translateWindow(interval)}
      `,
      queryId: 'deliveries_over_time',
      timeout: 10_000,
    });

    return result.data.map(row => toDeliveryBucket(BucketRowModel.parse(row)));
  }

  /**
   * The most recent attempts decide the status. The lookups around them walk the sort key and stop
   * early, so the scan grows with the current streak rather than with the destination's history.
   * That needs a destination; a selector without one gets `getLastOutcomes` instead.
   */
  async getHealth(input: DeliverySelector): Promise<DeliveryHealth> {
    this.logger.debug('Reading delivery health (destination=%s)', input.destination ?? '*');
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        WITH
          (
            SELECT max("timestamp")
            FROM (
              SELECT "timestamp"
              FROM "outbound_deliveries"
              WHERE ${this.whereSelector(input)} AND "ok" = 1
              ORDER BY "timestamp" DESC
              LIMIT 1
            )
          ) AS last_success_ts
          , (
            SELECT (max("timestamp"), argMax("status_code", "timestamp"), argMax("status_text", "timestamp"))
            FROM (
              SELECT "timestamp", "status_code", "status_text"
              FROM "outbound_deliveries"
              WHERE ${this.whereSelector(input)} AND "ok" = 0
              ORDER BY "timestamp" DESC
              LIMIT 1
            )
          ) AS last_failure_row
          , (
            SELECT max("timestamp")
            FROM (
              SELECT "timestamp"
              FROM "outbound_deliveries"
              WHERE ${this.whereSelector(input)} AND "ok" = 0
                AND "timestamp" > (
                  SELECT max("timestamp")
                  FROM (
                    SELECT "timestamp"
                    FROM "outbound_deliveries"
                    WHERE ${this.whereSelector(input)} AND "ok" = 1
                    ORDER BY "timestamp" DESC
                    LIMIT 1
                  )
                )
              ORDER BY "timestamp" ASC
              LIMIT 1
            )
          ) AS streak_start_ts
        SELECT
          count() AS recent_attempts
          , countIf("ok" = 0) AS recent_failures
          , toUnixTimestamp(last_success_ts) AS last_success_at
          , toUnixTimestamp(last_failure_row.1) AS last_failure_at
          , last_failure_row.2 AS last_status_code
          , last_failure_row.3 AS last_status_text
          , toUnixTimestamp(streak_start_ts) AS failing_since
        FROM (
          SELECT "timestamp", "ok"
          FROM "outbound_deliveries"
          WHERE ${this.whereSelector(input)}
          ORDER BY "timestamp" DESC
          LIMIT ${sql.raw(String(FAILURE_STREAK_LENGTH))}
        )
      `,
      queryId: 'delivery_health',
      timeout: 10_000,
    });

    return toDeliveryHealth(HealthRowModel.parse(result.data[0]));
  }

  /**
   * When the selection last succeeded and last failed, in one aggregation pass with no ordering,
   * so a selector without a destination reads its rows once rather than once per lookup.
   */
  async getLastOutcomes(input: DeliverySelector): Promise<LastOutcomes> {
    this.logger.debug('Reading last delivery outcomes (destination=%s)', input.destination ?? '*');
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          toUnixTimestamp(maxIf("timestamp", "ok" = 1)) AS last_success_at
          , toUnixTimestamp(maxIf("timestamp", "ok" = 0)) AS last_failure_at
        FROM "outbound_deliveries"
        WHERE ${this.whereSelector(input)}
      `,
      queryId: 'delivery_last_outcomes',
      timeout: 10_000,
    });

    const row = LastOutcomesRowModel.parse(result.data[0]);
    return {
      lastSuccessAt: epochToDate(row.last_success_at),
      lastFailureAt: epochToDate(row.last_failure_at),
    };
  }

  /** The most recent attempts within the period, newest first. */
  async getLog(
    input: DeliverySelector & { period: DateRange; limit?: number },
  ): Promise<Delivery[]> {
    const limit = Math.min(
      MAX_DELIVERY_LOG_LIMIT,
      Math.max(1, Math.floor(input.limit ?? DEFAULT_DELIVERY_LOG_LIMIT)),
    );

    this.logger.debug(
      'Reading delivery log (destination=%s, limit=%s)',
      input.destination ?? '*',
      limit,
    );
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          toUnixTimestamp("timestamp") AS unix_timestamp
          , "event"
          , "destination"
          , "idempotency_key"
          , "ok"
          , "status_code"
          , "status_text"
          , "duration_ms"
          , "attempt"
          , "max_attempts"
          , "metadata"
        FROM "outbound_deliveries"
        WHERE
          ${this.whereSelector(input)}
          AND "timestamp" >= toDateTime(${formatDateTime(input.period.from)}, 'UTC')
          AND "timestamp" <= toDateTime(${formatDateTime(input.period.to)}, 'UTC')
        ORDER BY "timestamp" DESC
        LIMIT ${sql.raw(String(limit))}
      `,
      queryId: 'delivery_log',
      timeout: 10_000,
    });

    return result.data.map(row => toDelivery(LogRowModel.parse(row)));
  }

  /**
   * The most recent attempt for each of the given idempotency keys since a point in time: one
   * query for a page of notifications, keyed by idempotency key. `since` bounds the scan.
   */
  async getLatestByKey(input: {
    organizationId: string;
    deliveryType: DeliveryType;
    keys: string[];
    since: Date;
  }): Promise<Map<string, Delivery>> {
    const keys = [...new Set(input.keys)];
    if (keys.length === 0) {
      return new Map();
    }

    this.logger.debug('Reading latest deliveries by key (keys=%s)', keys.length);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          toUnixTimestamp("timestamp") AS unix_timestamp
          , "event"
          , "destination"
          , "idempotency_key"
          , "ok"
          , "status_code"
          , "status_text"
          , "duration_ms"
          , "attempt"
          , "max_attempts"
          , "metadata"
        FROM "outbound_deliveries"
        WHERE
          ${this.whereSelector({ organizationId: input.organizationId, deliveryType: input.deliveryType })}
          AND "idempotency_key" IN (${sql.array(keys, 'String')})
          AND "timestamp" >= toDateTime(${formatDateTime(input.since)}, 'UTC')
        ORDER BY "timestamp" DESC
        LIMIT 1 BY "idempotency_key"
      `,
      queryId: 'latest_deliveries_by_key',
      timeout: 5_000,
    });

    return new Map(
      result.data.map(data => {
        const row = LogRowModel.parse(data);
        return [row.idempotency_key, toDelivery(row)];
      }),
    );
  }
}

export function toDeliveryBucket(row: z.infer<typeof BucketRowModel>): DeliveryBucket {
  return { date: parseDateTime(row.date), total: row.total, failed: row.failed };
}

export function toDeliveryHealth(row: HealthRow): DeliveryHealth {
  if (row.recent_attempts === 0) {
    return {
      status: 'UNKNOWN',
      lastSuccessAt: null,
      lastFailureAt: null,
      lastStatusCode: null,
      lastStatusText: null,
      failingSince: null,
    };
  }

  const lastFailureAt = epochToDate(row.last_failure_at);
  const failing = row.recent_failures >= FAILURE_STREAK_LENGTH;

  return {
    status: failing ? 'FAILING' : 'HEALTHY',
    lastSuccessAt: epochToDate(row.last_success_at),
    lastFailureAt,
    lastStatusCode: row.last_status_code === 0 ? null : row.last_status_code,
    lastStatusText: row.last_status_text === '' ? null : row.last_status_text,
    // A success and a failure in the same second leave the streak start empty; the streak then
    // starts at the latest failure.
    failingSince: failing ? (epochToDate(row.failing_since) ?? lastFailureAt) : null,
  };
}

export function toDelivery(row: LogRow): Delivery {
  return {
    timestamp: new Date(row.unix_timestamp * 1000),
    event: DeliveryEventModel.parse(row.event.toUpperCase()),
    destination: row.destination,
    idempotencyKey: row.idempotency_key === '' ? null : row.idempotency_key,
    ok: row.ok === 1,
    statusCode: row.status_code === 0 ? null : row.status_code,
    statusText: row.status_text,
    durationMs: row.duration_ms,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    metadata: row.metadata,
  };
}

/** ClickHouse renders an empty `maxIf`/`minIf` over DateTime as the epoch. */
function epochToDate(seconds: number): Date | null {
  return seconds === 0 ? null : new Date(seconds * 1000);
}
