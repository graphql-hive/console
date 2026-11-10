import type { Logger } from '@graphql-hive/logger';
import { formatDateTime, sql, toQueryParams } from '@hive/clickhouse';
import type { ClickHouseClient } from './clickhouse-client.js';
import type { AlertChannelDeliveryEvent } from './delivery-metadata.js';

const MAX_STATUS_TEXT_LENGTH = 512;

/** What the row says when nothing usable answered; the error itself goes to the job's log. */
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
 * `Timed out` when nothing did. Null for anything it does not recognise, which `trackDelivery`
 * masks as `Unexpected error`. Each sender exports its own, next to the client whose error shapes
 * it knows.
 */
export type DescribeDeliveryError = (error: unknown) => DeliveryOutcome | null;

/** An outcome whose text is bounded to what the column holds. */
export function deliveryOutcome(statusCode: number | null, statusText: string): DeliveryOutcome {
  return { statusCode, statusText: truncateStatusText(statusText) };
}

/** Slack's API answered `ok: true`; the SDK exposes no HTTP status on success. */
export const SLACK_OK: DeliveryOutcome = { statusCode: null, statusText: 'ok' };

/** The kind of destination a delivery went to: an alert channel type, or email. */
export type DeliveryType = 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK' | 'DISCORD' | 'EMAIL';
export type EmailDeliveryEvent =
  | 'organization_invitation'
  | 'organization_ownership_transfer'
  | 'audit_log_export'
  | 'usage_rate_limit_warning'
  | 'usage_rate_limit_exceeded';
export type DeliveryEvent = AlertChannelDeliveryEvent | EmailDeliveryEvent;

export interface DeliveryMeta {
  organizationId: string;
  deliveryType: DeliveryType;
  /** Where it went: the alert channel id, or the recipient address. */
  destination: string;
  event: DeliveryEvent;
  /**
   * Identifies the notification across its attempts: the Idempotency-Key sent to the channel, or
   * the key the API assigned to the email. Null for an email that has none.
   */
  idempotencyKey: string | null;
  /** graphile-worker attempt number of the job making the call. */
  attempt: number;
  /** The retry budget of that job. */
  maxAttempts: number;
  /**
   * Exactly what was sent to identify the call: the request headers, the Slack metadata
   * flattened, or the email's subject and the ids that locate it.
   */
  metadata: Record<string, string>;
}

export interface DeliveryAttempt extends DeliveryMeta, DeliveryOutcome {
  ok: boolean;
  durationMs: number;
}

export type DeliveryRecorder = {
  /** Never throws: a lost stats row must not fail the notification. */
  record(attempt: DeliveryAttempt): Promise<void>;
};

/**
 * Records every outbound delivery attempt made by this service in ClickHouse
 * (`outbound_deliveries`). Without ClickHouse configured, nothing is recorded.
 */
export function createDeliveryRecorder(
  clickhouse: ClickHouseClient | null,
  logger: Logger,
): DeliveryRecorder {
  if (!clickhouse) {
    return { async record() {} };
  }

  return {
    async record(attempt) {
      try {
        const statement = sql`
          INSERT INTO "outbound_deliveries" (
            "timestamp"
            , "organization_id"
            , "delivery_type"
            , "destination"
            , "event"
            , "idempotency_key"
            , "attempt"
            , "max_attempts"
            , "ok"
            , "status_code"
            , "status_text"
            , "duration_ms"
            , "metadata"
          )
          VALUES (
            ${formatDateTime(new Date())}
            , ${attempt.organizationId}
            , ${attempt.deliveryType}
            , ${attempt.destination}
            , ${attempt.event}
            , ${attempt.idempotencyKey ?? ''}
            , toUInt8(${String(Math.min(255, Math.max(1, attempt.attempt)))})
            , toUInt8(${String(Math.min(255, Math.max(1, attempt.maxAttempts)))})
            , toUInt8(${attempt.ok ? '1' : '0'})
            , toUInt16(${String(attempt.statusCode ?? 0)})
            , ${truncateStatusText(attempt.statusText)}
            , toUInt32(${String(Math.max(0, Math.round(attempt.durationMs)))})
            , JSONExtract(${JSON.stringify(attempt.metadata)}, 'Map(String, String)')
          )
        `;
        await clickhouse.command(statement.sql, 'record-delivery', toQueryParams(statement));
      } catch (error) {
        logger.error(
          {
            destination: attempt.destination,
            event: attempt.event,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to record delivery',
        );
      }
    },
  };
}

/**
 * Runs `send`, records exactly one attempt for it (success or failure) and rethrows its error.
 * A failure is recorded as `describeError` reads it, or masked when it does not recognise it;
 * the rethrown error reaches graphile-worker, which logs its message and stack. `metadata`
 * learned from the answer (the vendor's message id) is recorded with what was sent.
 */
export async function trackDelivery<T>(
  recorder: DeliveryRecorder,
  meta: DeliveryMeta,
  send: () => Promise<{ outcome: DeliveryOutcome; value: T; metadata?: Record<string, string> }>,
  describeError: DescribeDeliveryError,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const { outcome, value, metadata } = await send();
    await recorder.record({
      ...meta,
      ...outcome,
      metadata: metadata ? { ...meta.metadata, ...metadata } : meta.metadata,
      ok: true,
      durationMs: Date.now() - startedAt,
    });
    return value;
  } catch (error) {
    const failure = describeError(error) ?? deliveryOutcome(null, UNEXPECTED_ERROR);
    await recorder.record({ ...meta, ...failure, ok: false, durationMs: Date.now() - startedAt });
    throw error;
  }
}

function truncateStatusText(text: string): string {
  return text.length > MAX_STATUS_TEXT_LENGTH ? text.slice(0, MAX_STATUS_TEXT_LENGTH) : text;
}
