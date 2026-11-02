/**
 * Identifiers Hive attaches to every alert-channel delivery, so a receiver can correlate the call
 * with Hive (request id, event, target, schema version) and deduplicate retries (idempotency key).
 * Webhook channels get them as request headers. Slack's API is not the customer's endpoint, so Slack
 * messages carry the same values as message metadata instead.
 */
export type AlertChannelDeliveryEvent = 'schema_change' | 'metric_alert' | 'channel_confirmation';

export interface DeliveryMetadataInput {
  requestId: string;
  event: AlertChannelDeliveryEvent;
  /** Target the event belongs to; absent for channel confirmations. */
  targetId?: string | null;
  /** Schema version id; schema changes only. */
  schemaId?: string | null;
  /** Hive release, for the User-Agent. */
  release: string;
  idempotencyKey: string;
}

export function hiveWebhooksUserAgent(release: string): string {
  return `Hive-Webhooks/${release}`;
}

export function buildHiveWebhookHeaders(input: DeliveryMetadataInput): Record<string, string> {
  return {
    'Hive-Request-ID': input.requestId,
    'Hive-Event': input.event,
    ...(input.targetId ? { 'Hive-Target-ID': input.targetId } : {}),
    ...(input.schemaId ? { 'Hive-Schema-ID': input.schemaId } : {}),
    'User-Agent': hiveWebhooksUserAgent(input.release),
    'Idempotency-Key': input.idempotencyKey,
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
      hive_request_id: input.requestId,
      ...(input.targetId ? { hive_target_id: input.targetId } : {}),
      ...(input.schemaId ? { hive_schema_id: input.schemaId } : {}),
      idempotency_key: input.idempotencyKey,
      user_agent: hiveWebhooksUserAgent(input.release),
    },
  };
}

/** What is stored for a Slack attempt: the metadata object as one flat string map. */
export function flattenSlackMetadata(metadata: SlackMessageMetadata): Record<string, string> {
  return { event_type: metadata.event_type, ...metadata.event_payload };
}
