import {
  buildAlertUrl,
  buildWebhookPayload,
  type NotificationEvent,
} from './metric-alert-notifier.js';

function makeEvent(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    state: 'firing',
    ruleId: 'rule-1',
    rule: {
      organizationId: 'org-1',
      name: 'p99 latency',
      type: 'LATENCY',
      metric: 'P99',
      severity: 'CRITICAL',
      thresholdType: 'FIXED_VALUE',
      thresholdValue: 2000,
      direction: 'ABOVE',
    },
    currentValue: 2500,
    previousValue: 1200,
    organizationSlug: 'acme',
    projectSlug: 'my-api',
    targetSlug: 'production',
    ...overrides,
  };
}

describe('buildAlertUrl', () => {
  it('points at the rule detail page', () => {
    expect(buildAlertUrl('https://app.graphql-hive.com', makeEvent())).toBe(
      'https://app.graphql-hive.com/acme/my-api/production/alerts/rule-1',
    );
  });

  it('returns null when the Hive Console URL is not configured', () => {
    expect(buildAlertUrl(null, makeEvent())).toBeNull();
  });
});

describe('buildWebhookPayload', () => {
  it('includes the alert url', () => {
    expect(buildWebhookPayload(makeEvent(), 'https://app.graphql-hive.com').url).toBe(
      'https://app.graphql-hive.com/acme/my-api/production/alerts/rule-1',
    );
  });

  // The key must stay present so consumers don't see the field appear and
  // disappear; the web app's alert-notification-preview.spec asserts the same
  // key list.
  it('keeps the url key as null when the Hive Console URL is not configured', () => {
    const payload = buildWebhookPayload(makeEvent(), null);

    expect(payload.url).toBeNull();
    expect('url' in payload).toBe(true);
  });
});
