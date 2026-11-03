import { Inject, Injectable } from 'graphql-modules';
import { formatDateTime } from '@hive/clickhouse';
import { getRequestId } from '@hive/service-common';
import { captureException } from '@sentry/node';
import type { AlertChannel } from '../../../shared/entities';
import { ClickHouse, sql } from '../../operations/providers/clickhouse-client';
import { Logger } from '../../shared/providers/logger';
import { RELEASE } from '../../shared/providers/tokens';
import type { AlertChannelDeliveryEvent, DeliveryMetadataInput } from '../lib/delivery-metadata';

const MAX_STATUS_TEXT_LENGTH = 512;

/** What the row says when nothing usable answered; the error itself goes to the log. */
export const TIMED_OUT = 'Timed out';
export const UNEXPECTED_ERROR = 'Unexpected error';

export interface DeliveryOutcome {
  /** HTTP status of the response; null when there was none. */
  statusCode: number | null;
  /**
   * Reason phrase or Slack API result code when the destination answered; otherwise `Timed out`
   * or `Unexpected error`, never an exception's message.
   */
  statusText: string;
}

/**
 * How a sender reads the errors of the client it uses: what the destination answered, or
 * `Timed out` when nothing did. Null for anything it does not recognise, which the recorder masks
 * as `Unexpected error` and logs. Each adapter exports its own, next to the client whose error
 * shapes it knows.
 */
export type DescribeDeliveryError = (error: unknown) => DeliveryOutcome | null;

/** An outcome whose text is bounded to what the column holds. */
export function deliveryOutcome(statusCode: number | null, statusText: string): DeliveryOutcome {
  return { statusCode, statusText: truncateStatusText(statusText) };
}

/** Slack's API answered `ok: true`; the SDK exposes no HTTP status on success. */
export const SLACK_OK: DeliveryOutcome = { statusCode: null, statusText: 'ok' };

/** The kind of destination a delivery went to. */
export type DeliveryType = AlertChannel['type'];
export type DeliveryEvent = AlertChannelDeliveryEvent;

export interface DeliveryMeta {
  organizationId: string;
  deliveryType: DeliveryType;
  /** Where it went: the alert channel id. */
  destination: string;
  event: DeliveryEvent;
  /** Exactly what was sent to identify the call: the request headers, or the Slack metadata flattened. */
  metadata: Record<string, string>;
}

export interface DeliveryAttempt extends DeliveryMeta, DeliveryOutcome {
  ok: boolean;
  durationMs: number;
}

/**
 * Records every outbound delivery attempt made by the API in ClickHouse (`outbound_deliveries`).
 * A singleton, because the Slack, Teams and Discord adapters are.
 */
@Injectable()
export class DeliveryRecorder {
  private logger: Logger;

  constructor(
    private clickHouse: ClickHouse,
    logger: Logger,
    @Inject(RELEASE) private release: string,
  ) {
    this.logger = logger.child({ source: 'DeliveryRecorder' });
  }

  describe(input: Omit<DeliveryMetadataInput, 'requestId' | 'release'>): DeliveryMetadataInput {
    return { requestId: getRequestId() ?? null, release: this.release, ...input };
  }

  /**
   * Runs `send`, records exactly one attempt for it (success or failure) and rethrows its error.
   * A failure is recorded as `describeError` reads it, or masked when it does not recognise it.
   */
  async track<T>(
    meta: DeliveryMeta,
    send: () => Promise<{ outcome: DeliveryOutcome; value: T }>,
    describeError: DescribeDeliveryError,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const { outcome, value } = await send();
      await this.record({ ...meta, ...outcome, ok: true, durationMs: Date.now() - startedAt });
      return value;
    } catch (error) {
      const failure = describeError(error) ?? this.maskUnexpectedError(meta, error);
      await this.record({ ...meta, ...failure, ok: false, durationMs: Date.now() - startedAt });
      throw error;
    }
  }

  /** The row says nothing about an error the sender did not recognise, so the log and Sentry must. */
  private maskUnexpectedError(meta: DeliveryMeta, error: unknown): DeliveryOutcome {
    this.logger.error(
      'Delivery failed unexpectedly (destination=%s, event=%s, error=%s)',
      meta.destination,
      meta.event,
      describeForLog(error),
    );
    captureException(error, { extra: { destination: meta.destination, event: meta.event } });
    return deliveryOutcome(null, UNEXPECTED_ERROR);
  }

  /**
   * Never throws: a lost stats row must not fail the notification. Goes through `insert`, which
   * does not resend after a timeout: ClickHouse keeps a buffered row whether or not the response
   * arrived, and a resend would count the attempt twice. The statement must end right after
   * `FORMAT CSV`: ClickHouse reads whatever follows it as the first row.
   */
  async record(attempt: DeliveryAttempt): Promise<void> {
    try {
      await this.clickHouse.insert({
        query: sql`
          INSERT INTO "outbound_deliveries" (
            "timestamp"
            , "organization_id"
            , "delivery_type"
            , "destination"
            , "event"
            , "attempt"
            , "max_attempts"
            , "ok"
            , "status_code"
            , "status_text"
            , "duration_ms"
            , "metadata"
          )
          FORMAT CSV`,
        data: [
          [
            formatDateTime(new Date()),
            attempt.organizationId,
            attempt.deliveryType,
            attempt.destination,
            attempt.event,
            1,
            1,
            attempt.ok ? 1 : 0,
            attempt.statusCode ?? 0,
            truncateStatusText(attempt.statusText),
            Math.max(0, Math.round(attempt.durationMs)),
            toMapLiteral(attempt.metadata),
          ],
        ],
        queryId: 'record-delivery',
        timeout: 5_000,
      });
    } catch (error) {
      this.logger.error(
        'Failed to record delivery (destination=%s, event=%s, error=%s)',
        attempt.destination,
        attempt.event,
        error instanceof Error ? error.message : String(error),
      );
      captureException(error, {
        extra: { destination: attempt.destination, event: attempt.event },
      });
    }
  }
}

/** The message, and the wrapped cause's code and message, for the log line of a masked failure. */
function describeForLog(error: unknown): string {
  const text =
    isRecord(error) && error.name ? `${String(error.name)}: ${messageOf(error)}` : messageOf(error);
  if (!isRecord(error) || !isRecord(error.cause)) {
    return text;
  }
  const cause = error.cause;
  const causeText =
    typeof cause.code === 'string' ? `${cause.code}: ${messageOf(cause)}` : messageOf(cause);
  return `${text} (cause: ${causeText})`;
}

function messageOf(value: unknown): string {
  if (isRecord(value) && typeof value.message === 'string') {
    return value.message;
  }
  return typeof value === 'string' ? value : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A Map(String, String) in the text form ClickHouse reads from a CSV field: Values syntax. */
function toMapLiteral(map: Record<string, string>): string {
  const quote = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return `{${Object.entries(map)
    .map(([key, value]) => `${quote(key)}:${quote(value)}`)
    .join(',')}}`;
}

function truncateStatusText(text: string): string {
  return text.length > MAX_STATUS_TEXT_LENGTH ? text.slice(0, MAX_STATUS_TEXT_LENGTH) : text;
}
