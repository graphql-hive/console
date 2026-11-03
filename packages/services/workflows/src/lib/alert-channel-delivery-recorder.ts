import type { Logger } from '@graphql-hive/logger';
import { sql, toQueryParams } from '@hive/clickhouse';
import type { ClickHouseClient } from './clickhouse-client.js';
import type { AlertChannelDeliveryEvent } from './delivery-metadata.js';

const MAX_STATUS_TEXT_LENGTH = 512;

export interface DeliveryOutcome {
  /** HTTP status of the response; null when there was none. */
  statusCode: number | null;
  /** Reason phrase, Slack API result code, or `<error code>: <message>` when nothing answered. */
  statusText: string;
}

/** Slack's API answered `ok: true`; the SDK exposes no HTTP status on success. */
export const SLACK_OK: DeliveryOutcome = { statusCode: null, statusText: 'ok' };

export interface DeliveryMeta {
  organizationId: string;
  projectId: string;
  channelId: string;
  channelType: 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK' | 'DISCORD';
  event: AlertChannelDeliveryEvent;
  /** graphile-worker attempt number of the job making the call. */
  attempt: number;
  /** Exactly what was sent to identify the call: the request headers, or the Slack metadata flattened. */
  metadata: Record<string, string>;
}

export interface AlertChannelDeliveryAttempt extends DeliveryMeta, DeliveryOutcome {
  ok: boolean;
  durationMs: number;
}

export type AlertChannelDeliveryRecorder = {
  /** Never throws: a lost stats row must not fail the notification. */
  record(attempt: AlertChannelDeliveryAttempt): Promise<void>;
};

/**
 * Records every alert-channel delivery attempt made by this service in ClickHouse
 * (`alert_channel_deliveries`). Without ClickHouse configured, nothing is recorded.
 */
export function createAlertChannelDeliveryRecorder(
  clickhouse: ClickHouseClient | null,
  logger: Logger,
): AlertChannelDeliveryRecorder {
  if (!clickhouse) {
    return { async record() {} };
  }

  return {
    async record(attempt) {
      try {
        const statement = sql`
          INSERT INTO "alert_channel_deliveries" (
            "timestamp"
            , "organization_id"
            , "project_id"
            , "channel_id"
            , "channel_type"
            , "event"
            , "attempt"
            , "ok"
            , "status_code"
            , "status_text"
            , "duration_ms"
            , "metadata"
          )
          VALUES (
            ${formatClickHouseDateTime(new Date())}
            , ${attempt.organizationId}
            , ${attempt.projectId}
            , ${attempt.channelId}
            , ${attempt.channelType}
            , ${attempt.event}
            , toUInt8(${String(Math.min(255, Math.max(1, attempt.attempt)))})
            , toUInt8(${attempt.ok ? '1' : '0'})
            , toUInt16(${String(attempt.statusCode ?? 0)})
            , ${truncateStatusText(attempt.statusText)}
            , toUInt32(${String(Math.max(0, Math.round(attempt.durationMs)))})
            , JSONExtract(${JSON.stringify(attempt.metadata)}, 'Map(String, String)')
          )
        `;
        await clickhouse.command(
          statement.sql,
          'record-alert-channel-delivery',
          toQueryParams(statement),
        );
      } catch (error) {
        logger.error(
          {
            channelId: attempt.channelId,
            event: attempt.event,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to record alert channel delivery',
        );
      }
    },
  };
}

/** Runs `send`, records exactly one attempt for it (success or failure) and rethrows its error. */
export async function trackDelivery<T>(
  recorder: AlertChannelDeliveryRecorder,
  meta: DeliveryMeta,
  send: () => Promise<{ outcome: DeliveryOutcome; value: T }>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const { outcome, value } = await send();
    await recorder.record({ ...meta, ...outcome, ok: true, durationMs: Date.now() - startedAt });
    return value;
  } catch (error) {
    await recorder.record({
      ...meta,
      ...describeDeliveryError(error),
      ok: false,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

/**
 * Status code and one-line status text for a failed delivery, from whatever the client threw.
 * When the destination answered, the HTTP status and reason phrase; for a Slack API answer, its
 * result code; when nothing answered, the transport error code and message.
 */
export function describeDeliveryError(error: unknown): DeliveryOutcome {
  if (isRecord(error)) {
    const code = typeof error.code === 'string' ? error.code : null;

    // @slack/web-api coded errors
    if (code === 'slack_webapi_platform_error') {
      const platformCode = isRecord(error.data) ? stringOrNull(error.data.error) : null;
      return outcome(null, platformCode ?? messageOf(error));
    }
    if (code === 'slack_webapi_rate_limited_error') {
      return outcome(429, 'rate_limited');
    }
    if (code === 'slack_webapi_request_error') {
      return outcome(null, transportText(error.original) ?? messageOf(error));
    }

    // Slack HTTP errors carry the status themselves
    const direct = statusOf(error);
    if (direct) {
      return direct;
    }
    // got HTTPError keeps it on the response
    if (isRecord(error.response)) {
      const fromResponse = statusOf(error.response);
      if (fromResponse) {
        return fromResponse;
      }
    }

    // Nothing answered: got RequestError carries the code itself, a wrapped Node error in `cause`.
    const transport = transportText(error.cause) ?? transportText(error);
    if (transport) {
      return outcome(null, transport);
    }
  }

  return outcome(null, messageOf(error));
}

function outcome(statusCode: number | null, statusText: string): DeliveryOutcome {
  return { statusCode, statusText: truncateStatusText(statusText) };
}

function statusOf(value: Record<string, unknown>): DeliveryOutcome | null {
  if (typeof value.statusCode !== 'number') {
    return null;
  }
  const text = stringOrNull(value.statusText) ?? stringOrNull(value.statusMessage) ?? '';
  return outcome(value.statusCode, text);
}

function transportText(value: unknown): string | null {
  if (
    !isRecord(value) ||
    typeof value.code !== 'string' ||
    value.code === 'ERR_NON_2XX_3XX_RESPONSE'
  ) {
    return null;
  }
  const message = messageOf(value);
  return message ? `${value.code}: ${message}` : value.code;
}

function messageOf(value: unknown): string {
  if (isRecord(value) && typeof value.message === 'string') {
    return value.message;
  }
  return typeof value === 'string' ? value : String(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function truncateStatusText(text: string): string {
  return text.length > MAX_STATUS_TEXT_LENGTH ? text.slice(0, MAX_STATUS_TEXT_LENGTH) : text;
}

function formatClickHouseDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
