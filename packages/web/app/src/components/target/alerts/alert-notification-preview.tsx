/**
 * Live preview of what the alert notification will look like when it fires.
 * Renders a mock Slack message, webhook JSON payload, or Teams card
 * based on the selected channel type.
 */

import { Copy } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import { useClipboard } from '@/lib/hooks/use-clipboard';

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
        metric: { enum: ['avg', 'p75', 'p90', 'p95', 'p99', null] },
        severity: { enum: ['info', 'warning', 'critical'] },
      },
    },
    currentValue: { type: 'number' },
    previousValue: { type: 'number' },
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
  },
};

type PreviewProps = {
  alertName: string;
  metricLabel: string;
  alertType: string;
  severity: string;
  direction: string;
  thresholdType: string;
  thresholdValue: string;
  channelType: 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK' | null;
  targetSlug: string;
  projectSlug: string;
};

const SEVERITY_COLORS = {
  // Tailwind needs to see full class strings to include them in the build.
  // Do NOT construct these dynamically.
  CRITICAL: { bar: 'bg-red-500', text: 'text-red-400' },
  WARNING: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
  INFO: { bar: 'bg-blue-400', text: 'text-blue-400' },
} as const;

function formatThreshold(direction: string, thresholdValue: string, thresholdType: string) {
  const val = thresholdValue || '-';
  const dir = direction === 'ABOVE' ? 'above' : 'below';
  const suffix = thresholdType === 'PERCENTAGE_CHANGE' ? '%' : '';
  return thresholdType === 'PERCENTAGE_CHANGE'
    ? `${direction === 'ABOVE' ? 'increased' : 'decreased'} by ${val}%`
    : `${dir} ${val}${suffix}`;
}

function SlackPreview(props: PreviewProps) {
  const colors =
    SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.WARNING;
  const threshold = formatThreshold(props.direction, props.thresholdValue, props.thresholdType);

  return (
    <div className="space-y-1">
      <div className="text-neutral-10 mb-2 text-xs font-medium">Slack preview</div>
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 rounded-md border p-3">
        {/* Bot header */}
        <div className="mb-2 flex items-center gap-2">
          <div className="bg-accent text-accent flex size-5 items-center justify-center rounded-sm text-[10px] font-bold">
            H
          </div>
          <span className="text-neutral-12 text-sm font-bold">Hive Alerts</span>
          <span className="text-neutral-8 text-xs">APP</span>
        </div>

        {/* Attachment with colored bar */}
        <div className="flex">
          <div className={`${colors.bar} w-1 shrink-0 rounded-l`} />
          <div className="bg-neutral-4/50 rounded-r p-3 text-sm leading-relaxed">
            <div className="text-neutral-12 font-bold">
              🚨 {props.alertName || 'Untitled alert'}
            </div>
            <div className="text-neutral-10 mt-1">
              {props.metricLabel} {threshold}
            </div>
            <div className="text-neutral-10 mt-1">
              Target:{' '}
              <code className="bg-neutral-5 rounded-sm px-1 text-xs">{props.targetSlug}</code> in{' '}
              <code className="bg-neutral-5 rounded-sm px-1 text-xs">{props.projectSlug}</code>
            </div>
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
 * — see alert-notification-preview.spec.ts for the sync test.
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
      value: props.thresholdValue ? parseFloat(props.thresholdValue) : 0,
      direction: props.direction || 'ABOVE',
    },
    target: { slug: props.targetSlug },
    project: { slug: props.projectSlug },
    organization: { slug: '' },
  };
}

function WebhookPreview(props: PreviewProps) {
  const payload = buildPreviewWebhookPayload(props);
  const copyToClipboard = useClipboard();

  return (
    <div className="space-y-3">
      <div className="text-neutral-10 mb-2 text-xs font-medium">Webhook payload preview</div>
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 rounded-md border p-3">
        <pre className="text-neutral-11 overflow-x-auto text-xs leading-relaxed">
          {JSON.stringify(payload, null, 2)}
        </pre>
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
  const threshold = formatThreshold(props.direction, props.thresholdValue, props.thresholdType);

  return (
    <div className="space-y-1">
      <div className="text-neutral-10 mb-2 text-xs font-medium">Teams preview</div>
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 overflow-hidden rounded-md border">
        {/* Theme color bar */}
        <div className={`${colors.bar} h-1`} />
        <div className="p-3">
          <div className="text-neutral-12 font-bold">🔴 {props.alertName || 'Untitled alert'}</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex">
              <span className="text-neutral-10 w-20">Condition</span>
              <span className="text-neutral-11">
                {props.metricLabel} {threshold}
              </span>
            </div>
            <div className="flex">
              <span className="text-neutral-10 w-20">Severity</span>
              <span className={colors.text}>{props.severity}</span>
            </div>
            <div className="flex">
              <span className="text-neutral-10 w-20">Target</span>
              <span className="text-neutral-11">
                {props.targetSlug} in {props.projectSlug}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertPreview(props: PreviewProps) {
  if (!props.channelType) {
    return (
      <div className="text-neutral-8 text-sm italic">
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
    default:
      return null;
  }

  return (
    <div className="space-y-2">
      {preview}
      <p className="text-neutral-8 text-xs">
        Preview is illustrative. Actual notifications will include live metric values.
      </p>
    </div>
  );
}
