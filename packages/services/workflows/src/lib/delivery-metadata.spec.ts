import {
  buildHiveSlackMetadata,
  buildHiveWebhookHeaders,
  flattenSlackMetadata,
} from './delivery-metadata.js';

const base = {
  requestId: 'req-1',
  release: '1.2.3',
  idempotencyKey: 'metric-alert:s1:ch1',
} as const;

describe('buildHiveWebhookHeaders', () => {
  test('sends the identifying headers of a metric alert', () => {
    expect(buildHiveWebhookHeaders({ ...base, event: 'metric_alert', targetId: 't1' })).toEqual({
      'Hive-Request-ID': 'req-1',
      'Hive-Event': 'metric_alert',
      'Hive-Target-ID': 't1',
      'User-Agent': 'Hive-Webhooks/1.2.3',
      'Idempotency-Key': 'metric-alert:s1:ch1',
    });
  });

  test('adds the schema version only for schema changes', () => {
    expect(
      buildHiveWebhookHeaders({ ...base, event: 'schema_change', targetId: 't1', schemaId: 'v1' })[
        'Hive-Schema-ID'
      ],
    ).toBe('v1');
    expect(
      buildHiveWebhookHeaders({ ...base, event: 'metric_alert', targetId: 't1' }),
    ).not.toHaveProperty('Hive-Schema-ID');
  });
});

describe('buildHiveSlackMetadata', () => {
  test('carries the same values as the headers, keyed for Slack', () => {
    const metadata = buildHiveSlackMetadata({ ...base, event: 'metric_alert', targetId: 't1' });

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
