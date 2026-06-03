/**
 * Ensures the webhook preview payload shape stays in sync with
 * the actual webhook payload built by the workflows notifier.
 *
 * If this test fails, it means someone changed one side without the other.
 * Update both:
 *   - Preview:  packages/web/app/src/components/target/alerts/alert-notification-preview.tsx
 *   - Notifier: packages/services/workflows/src/lib/metric-alert-notifier.ts
 */
import { buildPreviewWebhookPayload } from './alert-notification-preview';

/** Recursively extracts sorted key paths from an object (e.g. "alert.name", "threshold.type"). */
function getKeyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(obj).sort()) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getKeyPaths(value as Record<string, unknown>, fullKey));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

/**
 * The expected key paths of the webhook payload, derived from
 * `buildWebhookPayload` in metric-alert-notifier.ts.
 *
 * If the notifier's payload shape changes, update this list AND
 * the preview's `buildPreviewWebhookPayload` to match.
 */
const EXPECTED_WEBHOOK_KEYS = [
  'alert.metric',
  'alert.name',
  'alert.severity',
  'alert.type',
  'changePercent',
  'currentValue',
  'organization.slug',
  'previousValue',
  'project.slug',
  'state',
  'target.slug',
  'threshold.direction',
  'threshold.type',
  'threshold.value',
  'type',
];

describe('AlertPreview', () => {
  it('webhook preview payload has the same keys as the notifier payload', () => {
    const previewPayload = buildPreviewWebhookPayload({
      alertName: 'Test Alert',
      metricLabel: 'p99 latency',
      alertType: 'LATENCY',
      severity: 'WARNING',
      direction: 'ABOVE',
      thresholdType: 'FIXED_VALUE',
      thresholdValue: '200',
      channelType: 'WEBHOOK',
      targetSlug: 'production',
      projectSlug: 'my-api',
    });

    const previewKeys = getKeyPaths(previewPayload as unknown as Record<string, unknown>);

    expect(previewKeys).toEqual(EXPECTED_WEBHOOK_KEYS);
  });
});
