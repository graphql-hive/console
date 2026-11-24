import { createHash } from 'node:crypto';
import type { AlertChannel } from '../../../shared/entities';

/**
 * Identifiers Hive attaches to every alert-channel delivery, so a receiver can correlate the call
 * with Hive (request id, event, target, schema version) and deduplicate retries (idempotency key).
 * Webhook channels get them as request headers. Slack's API is not the customer's endpoint, so Slack
 * messages carry the same values as message metadata instead.
 */
export type AlertChannelDeliveryEvent = 'schema_change' | 'metric_alert' | 'channel_confirmation';

export interface DeliveryMetadataInput {
  /** Hive's request id; null when the call is not made while serving a request. */
  requestId: string | null;
  /** `test` is never recorded as a delivery: the recorder's event type leaves it out. */
  event: AlertChannelDeliveryEvent | 'test';
  /** Target the event belongs to; absent for channel confirmations. */
  targetId?: string | null;
  /** Schema version id; schema changes only. */
  schemaId?: string | null;
  /** Hive release, for the User-Agent. */
  release: string;
  /** Null only for a test notification sent without a request id. */
  idempotencyKey: string | null;
}

/**
 * The Idempotency-Key of a channel confirmation. A channel is created and deleted once, so its id
 * identifies those; it can be moved any number of times, so an update's key also carries the
 * destination it confirms, hashed, since endpoints embed tokens.
 */
export function channelConfirmationKey(
  kind: 'created' | 'deleted' | 'updated',
  channel: Pick<AlertChannel, 'id' | 'slackChannel' | 'webhookEndpoint'>,
): string {
  const key = `channel-confirmation:${kind}:${channel.id}`;
  if (kind !== 'updated') {
    return key;
  }
  const destination = channel.slackChannel ?? channel.webhookEndpoint ?? '';
  return `${key}:${createHash('sha256').update(destination).digest('hex').slice(0, 8)}`;
}

/** The subject is the channel's id, or the project's while the channel has not been created. */
export function testNotificationKey(requestId: string, subjectId: string): string {
  return `test:${requestId}:${subjectId}`;
}

export function buildHiveTestWebhookHeaders(input: DeliveryMetadataInput): Record<string, string> {
  return { ...buildHiveWebhookHeaders(input), 'Hive-Test': 'true' };
}

export function hiveWebhooksUserAgent(release: string): string {
  return `Hive-Webhooks/${release}`;
}

export function buildHiveWebhookHeaders(input: DeliveryMetadataInput): Record<string, string> {
  return {
    ...(input.requestId ? { 'Hive-Request-ID': input.requestId } : {}),
    'Hive-Event': input.event,
    ...(input.targetId ? { 'Hive-Target-ID': input.targetId } : {}),
    ...(input.schemaId ? { 'Hive-Schema-ID': input.schemaId } : {}),
    'User-Agent': hiveWebhooksUserAgent(input.release),
    ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
  };
}

/** Structurally the `MessageMetadata` accepted by `chat.postMessage`. */
export interface SlackMessageMetadata {
  event_type: string;
  event_payload: Record<string, string>;
}

/** The webhook headers as Slack message metadata: header names lowercased with underscores. */
export function buildHiveSlackMetadata(input: DeliveryMetadataInput): SlackMessageMetadata {
  return {
    event_type: input.event,
    event_payload: {
      ...(input.requestId ? { hive_request_id: input.requestId } : {}),
      ...(input.targetId ? { hive_target_id: input.targetId } : {}),
      ...(input.schemaId ? { hive_schema_id: input.schemaId } : {}),
      ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
      user_agent: hiveWebhooksUserAgent(input.release),
    },
  };
}

/** What is stored for a Slack attempt: the metadata object as one flat string map. */
export function flattenSlackMetadata(metadata: SlackMessageMetadata): Record<string, string> {
  return { event_type: metadata.event_type, ...metadata.event_payload };
}
