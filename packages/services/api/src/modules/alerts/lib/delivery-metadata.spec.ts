import {
  buildHiveSlackMetadata,
  buildHiveWebhookHeaders,
  flattenSlackMetadata,
} from './delivery-metadata';

const base = {
  requestId: 'req-1',
  release: '1.2.3',
  idempotencyKey: 'schema-change:v1:ch1',
} as const;

describe('buildHiveWebhookHeaders', () => {
  test('sends the identifying headers of a schema change', () => {
    expect(
      buildHiveWebhookHeaders({ ...base, event: 'schema_change', targetId: 't1', schemaId: 'v1' }),
    ).toEqual({
      'Hive-Request-ID': 'req-1',
      'Hive-Event': 'schema_change',
      'Hive-Target-ID': 't1',
      'Hive-Schema-ID': 'v1',
      'User-Agent': 'Hive-Webhooks/1.2.3',
      'Idempotency-Key': 'schema-change:v1:ch1',
    });
  });

  test('omits the target and schema headers when the event has none', () => {
    const headers = buildHiveWebhookHeaders({
      ...base,
      event: 'channel_confirmation',
      idempotencyKey: 'channel-confirmation:created:ch1',
    });

    expect(headers).not.toHaveProperty('Hive-Target-ID');
    expect(headers).not.toHaveProperty('Hive-Schema-ID');
    expect(headers['Hive-Event']).toBe('channel_confirmation');
    expect(headers['Idempotency-Key']).toBe('channel-confirmation:created:ch1');
  });
});

describe('buildHiveSlackMetadata', () => {
  test('carries the same values as the headers, keyed for Slack', () => {
    const metadata = buildHiveSlackMetadata({
      ...base,
      event: 'metric_alert',
      targetId: 't1',
      idempotencyKey: 'metric-alert:s1:ch1',
    });

    expect(metadata).toEqual({
      event_type: 'metric_alert',
      event_payload: {
        hive_request_id: 'req-1',
        hive_target_id: 't1',
        idempotency_key: 'metric-alert:s1:ch1',
        user_agent: 'Hive-Webhooks/1.2.3',
      },
    });
    expect(flattenSlackMetadata(metadata)).toEqual({
      event_type: 'metric_alert',
      ...metadata.event_payload,
    });
  });
});
