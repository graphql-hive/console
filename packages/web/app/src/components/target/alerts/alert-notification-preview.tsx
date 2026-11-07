/**
 * Live preview of what the alert notification will look like when it fires.
 * Renders a mock Slack message, webhook JSON payload, or Teams card
 * based on the selected channel type.
 */

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { useClipboard } from '@/lib/hooks/use-clipboard';
import { applyThresholdSign, thresholdUnit } from './alert-threshold';
import * as styles from './alert-notification-preview.css';

const WEBHOOK_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: [
    'type',
    'state',
    'alert',
    'currentValue',
    'previousValue',
    'threshold',
    'target',
    'project',
    'organization',
  ],
  properties: {
    type: { const: 'metric_alert' },
    state: { enum: ['firing', 'resolved'] },
    alert: {
      type: 'object',
      required: ['name', 'type', 'severity'],
      properties: {
        name: { type: 'string' },
        type: { enum: ['LATENCY', 'ERROR_RATE', 'TRAFFIC'] },
        metric: { enum: ['AVG', 'P75', 'P90', 'P95', 'P99', null] },
        severity: { enum: ['info', 'warning', 'critical'] },
      },
    },
    currentValue: { type: 'number' },
    previousValue: { type: ['number', 'null'] },
    changePercent: { type: ['number', 'null'] },
    threshold: {
      type: 'object',
      required: ['type', 'value', 'direction'],
      properties: {
        type: { enum: ['FIXED_VALUE', 'PERCENTAGE_CHANGE'] },
        value: { type: 'number' },
        direction: { enum: ['ABOVE', 'BELOW'] },
      },
    },
    target: {
      type: 'object',
      properties: { slug: { type: 'string' } },
    },
    project: {
      type: 'object',
      properties: { slug: { type: 'string' } },
    },
    organization: {
      type: 'object',
      properties: { slug: { type: 'string' } },
    },
    url: { type: ['string', 'null'] },
  },
};

/** Channel types this preview can render. Callers narrow to this before passing. */
export type AlertPreviewChannelType = 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK' | 'DISCORD';

type PreviewProps = {
  alertName: string;
  metricLabel: string;
  alertType: string;
  severity: string;
  direction: string;
  thresholdType: string;
  thresholdValue: string;
  channelType: AlertPreviewChannelType | null;
  targetSlug: string;
  projectSlug: string;
  /** Link back to the rule, included in every real notification. */
  alertUrl: string;
};

const SEVERITY_COLORS = {
  CRITICAL: { bar: styles.severityColorsBar, text: styles.severityColorsText },
  WARNING: { bar: styles.severityColorsBar2, text: styles.severityColorsText2 },
  INFO: { bar: styles.severityColorsBar3, text: styles.severityColorsText3 },
} as const;

function formatThreshold(
  alertType: string,
  direction: string,
  thresholdValue: string,
  thresholdType: string,
) {
  const val = thresholdValue || '-';
  const dir = direction === 'ABOVE' ? 'above' : 'below';
  // Mirror the unit logic in formatChangeText() in
  // packages/services/workflows/src/lib/metric-alert-notifier.ts so the preview
  // matches the real notification. The shared `thresholdUnit` keeps this in
  // sync with the form's Value label; "requests" carries a leading space so it
  // reads "150 requests" rather than "150requests".
  const unitToken = thresholdUnit(alertType, thresholdType);
  const unit = unitToken === 'requests' ? ' requests' : unitToken;
  return thresholdType === 'PERCENTAGE_CHANGE'
    ? `${direction === 'ABOVE' ? 'increased' : 'decreased'} by ${val}${unit}`
    : `${dir} ${val}${unit}`;
}

/**
 * The notification message labels a TRAFFIC alert as "Traffic" (see
 * formatChangeText in packages/services/workflows/src/lib/metric-alert-notifier.ts),
 * while the form's metric dropdown calls it "Total requests". Use the
 * notification's wording in the preview so it matches the real message and so
 * it doesn't read redundantly as "Total requests ... 150 requests". Error-rate
 * and latency labels already match the notifier, so they pass through unchanged.
 */
function notificationMetricLabel(alertType: string, metricLabel: string) {
  return alertType === 'TRAFFIC' ? 'Traffic' : metricLabel;
}

function SlackPreview(props: PreviewProps) {
  const colors =
    SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.WARNING;
  const threshold = formatThreshold(
    props.alertType,
    props.direction,
    props.thresholdValue,
    props.thresholdType,
  );

  return (
    <div className={styles.slackPreviewDiv}>
      <div className={styles.slackPreviewDiv2}>Slack preview</div>
      <div className={styles.slackPreviewDiv3}>
        {/* Bot header */}
        <div className={styles.slackPreviewDiv4}>
          <div className={styles.slackPreviewDiv5}>H</div>
          <span className={styles.slackPreviewSpan}>Hive Alerts</span>
          <span className={styles.slackPreviewSpan2}>APP</span>
        </div>

        {/* Attachment with colored bar */}
        <div className={styles.slackPreviewDiv6}>
          <div className={`${colors.bar} ${styles.slackPreviewDiv7}`} />
          <div className={styles.slackPreviewDiv8}>
            <div className={styles.slackPreviewDiv9}>{props.alertName || 'Untitled alert'}</div>
            <div className={styles.slackPreviewDiv10}>
              {notificationMetricLabel(props.alertType, props.metricLabel)} {threshold}
            </div>
            <div className={styles.slackPreviewDiv11}>
              Target: <code className={styles.slackPreviewCode}>{props.targetSlug}</code> in{' '}
              <code className={styles.slackPreviewCode2}>{props.projectSlug}</code>
            </div>
            <div className={styles.slackPreviewDiv12}>View alert in Hive</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Builds a representative webhook payload for the preview.
 * The shape must match `buildWebhookPayload` in
 * packages/services/workflows/src/lib/metric-alert-notifier.ts
 */
export function buildPreviewWebhookPayload(props: PreviewProps) {
  return {
    type: 'metric_alert',
    state: 'firing',
    alert: {
      name: props.alertName || 'Untitled alert',
      type: props.alertType,
      metric: props.alertType === 'LATENCY' ? props.metricLabel : null,
      severity: props.severity.toLowerCase(),
    },
    currentValue: 0,
    previousValue: 0,
    changePercent: null,
    threshold: {
      type: props.thresholdType || 'FIXED_VALUE',
      // The form edits a non-negative magnitude; the stored/real payload value
      // is signed (a % drop is negative), so sign it here to match the notifier.
      value: props.thresholdValue
        ? applyThresholdSign(parseFloat(props.thresholdValue), props.thresholdType, props.direction)
        : 0,
      direction: props.direction || 'ABOVE',
    },
    target: { slug: props.targetSlug },
    project: { slug: props.projectSlug },
    organization: { slug: '' },
    url: props.alertUrl,
  };
}

function WebhookPreview(props: PreviewProps) {
  const payload = buildPreviewWebhookPayload(props);
  const copyToClipboard = useClipboard();

  return (
    <div className={styles.webhookPreviewDiv}>
      <div className={styles.webhookPreviewDiv2}>Webhook payload preview</div>
      <div className={styles.webhookPreviewDiv3}>
        <ScrollArea axis="horizontal">
          <pre className={styles.webhookPreviewPre}>{JSON.stringify(payload, null, 2)}</pre>
        </ScrollArea>
      </div>
      <Button
        type="button"
        label="Copy JSON Schema"
        rightIcon={{
          icon: Copy,
          withSeparator: true,
        }}
        onClick={() => {
          void copyToClipboard(JSON.stringify(WEBHOOK_JSON_SCHEMA, null, 2));
        }}
      />
    </div>
  );
}

function TeamsPreview(props: PreviewProps) {
  const colors =
    SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.WARNING;
  const threshold = formatThreshold(
    props.alertType,
    props.direction,
    props.thresholdValue,
    props.thresholdType,
  );

  return (
    <div className={styles.teamsPreviewDiv}>
      <div className={styles.teamsPreviewDiv2}>Teams preview</div>
      <div className={styles.teamsPreviewDiv3}>
        {/* Theme color bar */}
        <div className={`${colors.bar} ${styles.teamsPreviewDiv4}`} />
        <div className={styles.teamsPreviewDiv5}>
          <div className={styles.teamsPreviewDiv6}>{props.alertName || 'Untitled alert'}</div>
          <div className={styles.teamsPreviewDiv7}>
            <div className={styles.teamsPreviewDiv8}>
              <span className={styles.teamsPreviewSpan}>Condition</span>
              <span className={styles.teamsPreviewSpan2}>
                {notificationMetricLabel(props.alertType, props.metricLabel)} {threshold}
              </span>
            </div>
            <div className={styles.teamsPreviewDiv9}>
              <span className={styles.teamsPreviewSpan3}>Severity</span>
              <span className={colors.text}>{props.severity}</span>
            </div>
            <div className={styles.teamsPreviewDiv10}>
              <span className={styles.teamsPreviewSpan4}>Target</span>
              <span className={styles.teamsPreviewSpan5}>
                {props.targetSlug} in {props.projectSlug}
              </span>
            </div>
          </div>
          <div className={styles.teamsPreviewDiv11}>View alert in Hive</div>
        </div>
      </div>
    </div>
  );
}

function DiscordPreview(props: PreviewProps) {
  const colors =
    SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.WARNING;
  const threshold = formatThreshold(
    props.alertType,
    props.direction,
    props.thresholdValue,
    props.thresholdType,
  );

  return (
    <div className={styles.discordPreviewDiv}>
      <div className={styles.discordPreviewDiv2}>Discord preview</div>
      <div className={styles.discordPreviewDiv3}>
        {/* Discord embeds render the severity color as a vertical bar. */}
        <div className={`${colors.bar} ${styles.discordPreviewDiv4}`} />
        <div className={styles.discordPreviewDiv5}>
          <div className={styles.discordPreviewDiv6}>
            🔴 {props.alertName || 'Untitled alert'} — triggered
          </div>
          <div className={styles.discordPreviewDiv7}>
            {notificationMetricLabel(props.alertType, props.metricLabel)} {threshold}
          </div>
          <div className={styles.discordPreviewDiv8}>
            <div className={styles.discordPreviewDiv9}>
              <span className={styles.discordPreviewSpan}>Type</span>
              <span className={styles.discordPreviewSpan2}>{props.alertType}</span>
            </div>
            <div className={styles.discordPreviewDiv10}>
              <span className={styles.discordPreviewSpan3}>Severity</span>
              <span className={colors.text}>{props.severity}</span>
            </div>
            <div className={styles.discordPreviewDiv11}>
              <span className={styles.discordPreviewSpan4}>Target</span>
              <span className={styles.discordPreviewSpan5}>
                {props.targetSlug} in {props.projectSlug}
              </span>
            </div>
          </div>
          <div className={styles.discordPreviewDiv12}>View alert in Hive</div>
        </div>
      </div>
    </div>
  );
}

export function AlertPreview(props: PreviewProps) {
  if (!props.channelType) {
    return <div className={styles.alertPreviewDiv}>Select a destination to preview the alert.</div>;
  }

  let preview: React.ReactNode;
  switch (props.channelType) {
    case 'SLACK':
      preview = <SlackPreview {...props} />;
      break;
    case 'WEBHOOK':
      preview = <WebhookPreview {...props} />;
      break;
    case 'MSTEAMS_WEBHOOK':
      preview = <TeamsPreview {...props} />;
      break;
    case 'DISCORD':
      preview = <DiscordPreview {...props} />;
      break;
    default:
      return null;
  }

  return (
    <div className={styles.alertPreviewDiv2}>
      {preview}
      <p className={styles.alertPreviewP}>
        Preview is illustrative. Actual notifications will include live metric values.
      </p>
    </div>
  );
}
