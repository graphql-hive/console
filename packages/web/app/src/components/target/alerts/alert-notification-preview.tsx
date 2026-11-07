/**
 * Live preview of what the alert notification will look like when it fires.
 * Renders a mock Slack message, webhook JSON payload, or Teams card
 * based on the selected channel type.
 */

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { useClipboard } from '@/lib/hooks/use-clipboard';
import * as shared from '@/styles/shared.css';
import { applyThresholdSign, thresholdUnit } from './alert-threshold';
import { alertNotificationPreviewStyles } from './alert-notification-preview.css';

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
  CRITICAL: {
    bar: alertNotificationPreviewStyles.severityBar.critical,
    text: alertNotificationPreviewStyles.severityText.critical,
  },
  WARNING: {
    bar: alertNotificationPreviewStyles.severityBar.warning,
    text: alertNotificationPreviewStyles.severityText.warning,
  },
  INFO: {
    bar: alertNotificationPreviewStyles.severityBar.info,
    text: alertNotificationPreviewStyles.severityText.info,
  },
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
    <div className={alertNotificationPreviewStyles.slack}>
      <div className={alertNotificationPreviewStyles.slackLabel}>Slack preview</div>
      <div className={alertNotificationPreviewStyles.slackCard}>
        {/* Bot header */}
        <div className={alertNotificationPreviewStyles.slackHeader}>
          <div className={alertNotificationPreviewStyles.slackAvatar}>H</div>
          <span className={alertNotificationPreviewStyles.slackSender}>Hive Alerts</span>
          <span className={alertNotificationPreviewStyles.slackBadge}>APP</span>
        </div>

        {/* Attachment with colored bar */}
        <div className={shared.flex}>
          <div className={`${colors.bar} ${alertNotificationPreviewStyles.slackBar}`} />
          <div className={alertNotificationPreviewStyles.slackMessage}>
            <div className={alertNotificationPreviewStyles.slackTitle}>
              {props.alertName || 'Untitled alert'}
            </div>
            <div className={alertNotificationPreviewStyles.slackLine}>
              {notificationMetricLabel(props.alertType, props.metricLabel)} {threshold}
            </div>
            <div className={alertNotificationPreviewStyles.slackLine}>
              Target:{' '}
              <code className={alertNotificationPreviewStyles.slackCode}>{props.targetSlug}</code>{' '}
              in{' '}
              <code className={alertNotificationPreviewStyles.slackCode}>{props.projectSlug}</code>
            </div>
            <div className={alertNotificationPreviewStyles.slackLink}>View alert in Hive</div>
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
    <div className={alertNotificationPreviewStyles.webhook}>
      <div className={alertNotificationPreviewStyles.webhookLabel}>Webhook payload preview</div>
      <div className={alertNotificationPreviewStyles.webhookCard}>
        <ScrollArea axis="horizontal">
          <pre className={alertNotificationPreviewStyles.webhookPayload}>
            {JSON.stringify(payload, null, 2)}
          </pre>
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
    <div className={alertNotificationPreviewStyles.teams}>
      <div className={alertNotificationPreviewStyles.teamsLabel}>Teams preview</div>
      <div className={alertNotificationPreviewStyles.teamsCard}>
        {/* Theme color bar */}
        <div className={`${colors.bar} ${alertNotificationPreviewStyles.teamsBar}`} />
        <div className={alertNotificationPreviewStyles.teamsBody}>
          <div className={alertNotificationPreviewStyles.teamsTitle}>
            {props.alertName || 'Untitled alert'}
          </div>
          <div className={alertNotificationPreviewStyles.teamsFields}>
            <div className={shared.flex}>
              <span className={alertNotificationPreviewStyles.teamsFieldLabel}>Condition</span>
              <span className={shared.fg.default}>
                {notificationMetricLabel(props.alertType, props.metricLabel)} {threshold}
              </span>
            </div>
            <div className={shared.flex}>
              <span className={alertNotificationPreviewStyles.teamsFieldLabel}>Severity</span>
              <span className={colors.text}>{props.severity}</span>
            </div>
            <div className={shared.flex}>
              <span className={alertNotificationPreviewStyles.teamsFieldLabel}>Target</span>
              <span className={shared.fg.default}>
                {props.targetSlug} in {props.projectSlug}
              </span>
            </div>
          </div>
          <div className={alertNotificationPreviewStyles.teamsLink}>View alert in Hive</div>
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
    <div className={alertNotificationPreviewStyles.discord}>
      <div className={alertNotificationPreviewStyles.discordLabel}>Discord preview</div>
      <div className={alertNotificationPreviewStyles.discordCard}>
        {/* Discord embeds render the severity color as a vertical bar. */}
        <div className={`${colors.bar} ${alertNotificationPreviewStyles.discordBar}`} />
        <div className={alertNotificationPreviewStyles.discordBody}>
          <div className={alertNotificationPreviewStyles.discordTitle}>
            🔴 {props.alertName || 'Untitled alert'} — triggered
          </div>
          <div className={alertNotificationPreviewStyles.discordDescription}>
            {notificationMetricLabel(props.alertType, props.metricLabel)} {threshold}
          </div>
          <div className={alertNotificationPreviewStyles.discordFields}>
            <div className={shared.flex}>
              <span className={alertNotificationPreviewStyles.discordFieldLabel}>Type</span>
              <span className={shared.fg.default}>{props.alertType}</span>
            </div>
            <div className={shared.flex}>
              <span className={alertNotificationPreviewStyles.discordFieldLabel}>Severity</span>
              <span className={colors.text}>{props.severity}</span>
            </div>
            <div className={shared.flex}>
              <span className={alertNotificationPreviewStyles.discordFieldLabel}>Target</span>
              <span className={shared.fg.default}>
                {props.targetSlug} in {props.projectSlug}
              </span>
            </div>
          </div>
          <div className={alertNotificationPreviewStyles.discordLink}>View alert in Hive</div>
        </div>
      </div>
    </div>
  );
}

export function AlertPreview(props: PreviewProps) {
  if (!props.channelType) {
    return (
      <div className={alertNotificationPreviewStyles.empty}>
        Select a destination to preview the alert.
      </div>
    );
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
    <div className={alertNotificationPreviewStyles.root}>
      {preview}
      <p className={alertNotificationPreviewStyles.note}>
        Preview is illustrative. Actual notifications will include live metric values.
      </p>
    </div>
  );
}
