import { Injectable } from 'graphql-modules';
import { z } from 'zod';
import { formatDateTime, parseDateTime } from '@hive/clickhouse';
import type { DateRange } from '../../../shared/entities';
import { toEndOfInterval, toStartOfInterval } from '../../operations/lib/date-time-helpers';
import { ClickHouse, sql } from '../../operations/providers/clickhouse-client';
import { calculateTimeWindow } from '../../operations/providers/helpers';
import { Logger } from '../../shared/providers/logger';

export const DEFAULT_DELIVERY_LOG_LIMIT = 50;
export const MAX_DELIVERY_LOG_LIMIT = 200;

export type AlertChannelDeliveryEvent = 'SCHEMA_CHANGE' | 'METRIC_ALERT' | 'CHANNEL_CONFIRMATION';
export type AlertChannelHealthStatus = 'UNKNOWN' | 'HEALTHY' | 'FAILING';

export interface AlertChannelDeliveryTotals {
  total: number;
  failed: number;
}

export interface AlertChannelDeliveryBucket {
  date: Date;
  total: number;
  failed: number;
}

export interface AlertChannelDeliveryHealth {
  status: AlertChannelHealthStatus;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastStatusCode: number | null;
  lastStatusText: string | null;
  /** First failure after the last success; null unless FAILING. */
  failingSince: Date | null;
}

export interface AlertChannelDelivery {
  timestamp: Date;
  event: AlertChannelDeliveryEvent;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  durationMs: number;
  attempt: number;
  metadata: Record<string, string>;
}

type ChannelSelector = { projectId: string; channelId: string };

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
  total: z.coerce.number(),
  last_success_at: z.coerce.number(),
  last_failure_at: z.coerce.number(),
  last_status_code: z.coerce.number(),
  last_status_text: z.string(),
  latest_ok: z.coerce.number(),
  failing_since: z.coerce.number(),
});

const LogRowModel = z.object({
  unix_timestamp: z.coerce.number(),
  event: z.string(),
  ok: z.coerce.number(),
  status_code: z.coerce.number(),
  status_text: z.string(),
  duration_ms: z.coerce.number(),
  attempt: z.coerce.number(),
  metadata: z.record(z.string(), z.string()),
});

const DeliveryEventModel = z.enum(['SCHEMA_CHANGE', 'METRIC_ALERT', 'CHANNEL_CONFIRMATION']);

export type HealthRow = z.infer<typeof HealthRowModel>;
export type LogRow = z.infer<typeof LogRowModel>;

/** Reads `alert_channel_deliveries`, written by the API and workflows delivery recorders. */
@Injectable()
export class AlertChannelDeliveryReader {
  private logger: Logger;

  constructor(
    private clickHouse: ClickHouse,
    logger: Logger,
  ) {
    this.logger = logger.child({ source: 'AlertChannelDeliveryReader' });
  }

  /** Attempts in the period, and how many of them the destination did not accept. */
  async getTotals(
    input: ChannelSelector & { period: DateRange },
  ): Promise<AlertChannelDeliveryTotals> {
    this.logger.debug('Reading delivery totals (channel=%s)', input.channelId);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT count() AS total, countIf("ok" = 0) AS failed
        FROM "alert_channel_deliveries"
        WHERE
          "project_id" = ${input.projectId}
          AND "channel_id" = ${input.channelId}
          AND "timestamp" >= toDateTime(${formatDateTime(input.period.from)}, 'UTC')
          AND "timestamp" <= toDateTime(${formatDateTime(input.period.to)}, 'UTC')
      `,
      queryId: 'alert_channel_delivery_totals',
      timeout: 10_000,
    });

    return TotalsRowModel.parse(result.data[0]);
  }

  /** Attempts per bucket over the period; `resolution` is the number of buckets (1..90). */
  async getOverTime(
    input: ChannelSelector & { period: DateRange; resolution: number },
  ): Promise<AlertChannelDeliveryBucket[]> {
    const interval = calculateTimeWindow({ period: input.period, resolution: input.resolution });
    const from = formatDateTime(
      toStartOfInterval(input.period.from, interval.value, interval.unit),
    );
    const to = formatDateTime(toEndOfInterval(input.period.to, interval.value, interval.unit));
    const step = String(interval.seconds);

    this.logger.debug('Reading deliveries over time (channel=%s)', input.channelId);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          toDateTime(
            intDiv(toUnixTimestamp("timestamp"), toUInt32(${step})) * toUInt32(${step}),
            'UTC'
          ) AS date
          , count() AS total
          , countIf("ok" = 0) AS failed
        FROM "alert_channel_deliveries"
        WHERE
          "project_id" = ${input.projectId}
          AND "channel_id" = ${input.channelId}
          AND "timestamp" >= toDateTime(${from}, 'UTC')
          AND "timestamp" <= toDateTime(${to}, 'UTC')
        GROUP BY date
        ORDER BY date
        WITH FILL
          FROM toDateTime(${from}, 'UTC')
          TO toDateTime(${to}, 'UTC')
          STEP INTERVAL ${this.clickHouse.translateWindow(interval)}
      `,
      queryId: 'alert_channel_deliveries_over_time',
      timeout: 10_000,
    });

    return result.data.map(row => toDeliveryBucket(BucketRowModel.parse(row)));
  }

  /** The latest outcome and the current failure streak, over everything still retained. */
  async getHealth(input: ChannelSelector): Promise<AlertChannelDeliveryHealth> {
    this.logger.debug('Reading delivery health (channel=%s)', input.channelId);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        WITH (
          SELECT maxIf("timestamp", "ok" = 1)
          FROM "alert_channel_deliveries"
          WHERE "project_id" = ${input.projectId} AND "channel_id" = ${input.channelId}
        ) AS last_success
        SELECT
          count() AS total
          , toUnixTimestamp(maxIf("timestamp", "ok" = 1)) AS last_success_at
          , toUnixTimestamp(maxIf("timestamp", "ok" = 0)) AS last_failure_at
          , argMaxIf("status_code", "timestamp", "ok" = 0) AS last_status_code
          , argMaxIf("status_text", "timestamp", "ok" = 0) AS last_status_text
          -- a success and a failure in the same second count as failing
          , argMax("ok", ("timestamp", 1 - "ok")) AS latest_ok
          , toUnixTimestamp(minIf("timestamp", "ok" = 0 AND "timestamp" > last_success)) AS failing_since
        FROM "alert_channel_deliveries"
        WHERE "project_id" = ${input.projectId} AND "channel_id" = ${input.channelId}
      `,
      queryId: 'alert_channel_delivery_health',
      timeout: 10_000,
    });

    return toDeliveryHealth(HealthRowModel.parse(result.data[0]));
  }

  /** The most recent attempts within the period, newest first. */
  async getLog(
    input: ChannelSelector & { period: DateRange; limit?: number },
  ): Promise<AlertChannelDelivery[]> {
    const limit = Math.min(
      MAX_DELIVERY_LOG_LIMIT,
      Math.max(1, Math.floor(input.limit ?? DEFAULT_DELIVERY_LOG_LIMIT)),
    );

    this.logger.debug('Reading delivery log (channel=%s, limit=%s)', input.channelId, limit);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          toUnixTimestamp("timestamp") AS unix_timestamp
          , "event"
          , "ok"
          , "status_code"
          , "status_text"
          , "duration_ms"
          , "attempt"
          , "metadata"
        FROM "alert_channel_deliveries"
        WHERE
          "project_id" = ${input.projectId}
          AND "channel_id" = ${input.channelId}
          AND "timestamp" >= toDateTime(${formatDateTime(input.period.from)}, 'UTC')
          AND "timestamp" <= toDateTime(${formatDateTime(input.period.to)}, 'UTC')
        ORDER BY "timestamp" DESC
        LIMIT ${sql.raw(String(limit))}
      `,
      queryId: 'alert_channel_delivery_log',
      timeout: 10_000,
    });

    return result.data.map(row => toDelivery(LogRowModel.parse(row)));
  }
}

export function toDeliveryBucket(row: z.infer<typeof BucketRowModel>): AlertChannelDeliveryBucket {
  return { date: parseDateTime(row.date), total: row.total, failed: row.failed };
}

export function toDeliveryHealth(row: HealthRow): AlertChannelDeliveryHealth {
  if (row.total === 0) {
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
  const failing = row.latest_ok === 0;

  return {
    status: failing ? 'FAILING' : 'HEALTHY',
    lastSuccessAt: epochToDate(row.last_success_at),
    lastFailureAt,
    lastStatusCode: row.last_status_code === 0 ? null : row.last_status_code,
    lastStatusText: row.last_status_text === '' ? null : row.last_status_text,
    // A success and a failure in the same second leave `failing_since` empty; the streak then
    // starts at the latest failure.
    failingSince: failing ? (epochToDate(row.failing_since) ?? lastFailureAt) : null,
  };
}

export function toDelivery(row: LogRow): AlertChannelDelivery {
  return {
    timestamp: new Date(row.unix_timestamp * 1000),
    event: DeliveryEventModel.parse(row.event.toUpperCase()),
    ok: row.ok === 1,
    statusCode: row.status_code === 0 ? null : row.status_code,
    statusText: row.status_text,
    durationMs: row.duration_ms,
    attempt: row.attempt,
    metadata: row.metadata,
  };
}

/** ClickHouse renders an empty `maxIf`/`minIf` over DateTime as the epoch. */
function epochToDate(seconds: number): Date | null {
  return seconds === 0 ? null : new Date(seconds * 1000);
}
