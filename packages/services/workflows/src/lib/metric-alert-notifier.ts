import type { Logger } from '@graphql-hive/logger';
import type { PostgresDatabasePool } from '@hive/postgres';
import { psql } from '@hive/postgres';
import { WebClient } from '@slack/web-api';
import type { MetricAlertRuleRow } from './metric-alert-evaluator.js';
import { sendWebhook, type RequestBroker } from './webhooks/send-webhook.js';

export type AlertChannelRow = {
  id: string;
  type: 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK';
  name: string;
  slackChannel: string | null;
  webhookEndpoint: string | null;
};

export type NotificationEvent = {
  state: 'firing' | 'resolved';
  ruleId: string;
  rule: Pick<
    MetricAlertRuleRow,
    | 'organizationId'
    | 'name'
    | 'type'
    | 'metric'
    | 'severity'
    | 'thresholdType'
    | 'thresholdValue'
    | 'direction'
  >;
  currentValue: number;
  // Null for absolute-only groups that skip the previous window.
  previousValue: number | null;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
};

/**
 * How a dispatch attempt ended. Only `sent` means the destination actually received
 * something: `skipped-config` covers a channel that is missing the settings it needs,
 * and `gave-up` an exhausted retry budget. Both used to be indistinguishable from a
 * successful send.
 */
export type NotificationResult =
  | { status: 'sent' }
  | { status: 'skipped-config'; reason: string }
  | { status: 'gave-up' };

/**
 * Pure mapping from a dispatch result onto what the task records: the span outcome, the
 * reason (when there is one), and whether the notification actually reached its
 * destination, which is what gates the `metric_alert_notifications_sent` row.
 */
export function summarizeNotificationResult(result: NotificationResult): {
  outcome: NotificationResult['status'];
  delivered: boolean;
  reason: string | null;
} {
  switch (result.status) {
    case 'sent':
      return { outcome: 'sent', delivered: true, reason: null };
    case 'skipped-config':
      return { outcome: 'skipped-config', delivered: false, reason: result.reason };
    case 'gave-up':
      return { outcome: 'gave-up', delivered: false, reason: 'retries-exhausted' };
    default: {
      const exhaustive: never = result;
      throw new Error(`Unhandled notification result: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Deep link to the rule detail page. Null when the Hive Console URL isn't
 * configured (`WEB_APP_URL` is optional for the workflows service), in which
 * case notifications go out without a link.
 */
export function buildAlertUrl(webAppUrl: string | null, event: NotificationEvent): string | null {
  if (!webAppUrl) {
    return null;
  }

  return `${webAppUrl}/${event.organizationSlug}/${event.projectSlug}/${event.targetSlug}/alerts/${event.ruleId}`;
}

export async function sendSlackNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  pg: PostgresDatabasePool;
  logger: Logger;
  webAppUrl: string | null;
}): Promise<NotificationResult> {
  const { channel, event, pg, logger } = args;

  if (!channel.slackChannel) {
    logger.warn({ channelId: channel.id }, 'Slack channel name not configured');
    return { status: 'skipped-config', reason: 'no-slack-channel' };
  }

  const tokenResult = await pg.maybeOneFirst(psql`
    SELECT "slack_token"
    FROM "organizations"
    WHERE "id" = ${event.rule.organizationId}
  `);

  if (!tokenResult) {
    logger.warn(
      { organizationId: event.rule.organizationId },
      'Slack integration not configured for organization',
    );
    return { status: 'skipped-config', reason: 'no-slack-token' };
  }

  const token = tokenResult as string;
  const client = new WebClient(token);

  const isFiring = event.state === 'firing';
  const action = isFiring ? 'triggered' : 'resolved';
  // Slack renders the named presets (`good`/`warning`/`danger`) as the default
  // grey bar, so both states pass an explicit hex.
  const color = `#${isFiring ? severityColor(event.rule.severity) : RESOLVED_COLOR}`;

  const changeText = formatChangeText(event);
  const alertUrl = buildAlertUrl(args.webAppUrl, event);

  await client.chat.postMessage({
    channel: channel.slackChannel,
    text: `Metric alert ${action}: "${event.rule.name}"`,
    // Slack would otherwise attach a preview card for the console link.
    unfurl_links: false,
    unfurl_media: false,
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: [
                `*${event.rule.name}* — ${action}`,
                `Type: ${event.rule.type} | Severity: ${event.rule.severity}`,
                changeText,
                `Target: \`${event.targetSlug}\` in \`${event.projectSlug}\``,
                ...(alertUrl ? [`<${alertUrl}|View alert in Hive>`] : []),
              ].join('\n'),
            },
          },
        ],
      },
    ],
  });

  logger.debug({ channelId: channel.id }, 'Slack notification sent');

  return { status: 'sent' };
}

export async function sendWebhookNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  requestBroker: RequestBroker | null;
  logger: Logger;
  idempotencyKey: string;
  attempt: number;
  maxAttempts: number;
  webAppUrl: string | null;
}): Promise<NotificationResult> {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Webhook endpoint not configured');
    return { status: 'skipped-config', reason: 'no-webhook-endpoint' };
  }

  const payload = buildWebhookPayload(event, args.webAppUrl);

  const result = await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: payload,
    headers: { 'Idempotency-Key': args.idempotencyKey },
  });

  if (result.status === 'gave-up') {
    return result;
  }

  logger.debug({ channelId: channel.id }, 'Webhook notification sent');

  return { status: 'sent' };
}

export async function sendTeamsNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  requestBroker: RequestBroker | null;
  logger: Logger;
  idempotencyKey: string;
  attempt: number;
  maxAttempts: number;
  webAppUrl: string | null;
}): Promise<NotificationResult> {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Teams webhook endpoint not configured');
    return { status: 'skipped-config', reason: 'no-teams-endpoint' };
  }

  const isFiring = event.state === 'firing';
  const action = isFiring ? 'triggered' : 'resolved';
  const themeColor = isFiring ? severityColor(event.rule.severity) : RESOLVED_COLOR;

  const changeText = formatChangeText(event);
  const alertUrl = buildAlertUrl(args.webAppUrl, event);

  const card = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary: `Metric alert ${action}: "${event.rule.name}"`,
    sections: [
      {
        activityTitle: `${event.rule.name} — ${action}`,
        facts: [
          { name: 'Type', value: event.rule.type },
          { name: 'Severity', value: event.rule.severity },
          { name: 'Target', value: `${event.targetSlug} in ${event.projectSlug}` },
        ],
        text: alertUrl ? `${changeText}\n\n[View alert in Hive](${alertUrl})` : changeText,
      },
    ],
  };

  const result = await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: card,
    headers: { 'Idempotency-Key': args.idempotencyKey },
  });

  if (result.status === 'gave-up') {
    return result;
  }

  logger.debug({ channelId: channel.id }, 'Teams notification sent');

  return { status: 'sent' };
}

/**
 * Light mode severity ex colors (no leading `#`) for the notification's colored bar.
 */
const SEVERITY_COLORS: Record<NotificationEvent['rule']['severity'], string> = {
  INFO: '0465af',
  WARNING: 'c5870d',
  CRITICAL: 'c62424',
};
/**
 * Resolved-state green (no leading `#`), shared by Slack and Teams.
 */
const RESOLVED_COLOR = '2ECC71';

function severityColor(severity: NotificationEvent['rule']['severity']): string {
  return SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.WARNING;
}

function formatChangeText(event: NotificationEvent): string {
  const { rule, currentValue, previousValue } = event;
  const unit = rule.type === 'LATENCY' ? 'ms' : rule.type === 'ERROR_RATE' ? '%' : ' requests';
  const metricLabel =
    rule.type === 'LATENCY'
      ? `${rule.metric?.toLowerCase()} latency`
      : rule.type === 'ERROR_RATE'
        ? 'Error rate'
        : 'Traffic';

  if (event.state === 'firing') {
    const thresholdText = `Threshold: ${rule.direction.toLowerCase()} ${rule.thresholdValue}${rule.thresholdType === 'PERCENTAGE_CHANGE' ? '%' : unit}`;
    // Absolute-only rules have no previous window to compare against.
    if (previousValue === null) {
      return `${metricLabel}: **${currentValue.toFixed(2)}${unit}** — ${thresholdText}`;
    }
    const changePercent =
      previousValue !== 0
        ? (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
        : 'N/A';
    return `${metricLabel}: **${currentValue.toFixed(2)}${unit}** (was ${previousValue.toFixed(2)}${unit}, ${changePercent}% change) — ${thresholdText}`;
  }

  return `${metricLabel}: **${currentValue.toFixed(2)}${unit}** (threshold: ${rule.thresholdValue}${rule.thresholdType === 'PERCENTAGE_CHANGE' ? '%' : unit})`;
}

export function buildWebhookPayload(event: NotificationEvent, webAppUrl: string | null) {
  const { rule, currentValue, previousValue } = event;
  const changePercent =
    previousValue !== null && previousValue !== 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : null;

  return {
    type: 'metric_alert',
    state: event.state,
    alert: {
      name: rule.name,
      type: rule.type,
      metric: rule.metric,
      severity: rule.severity,
    },
    currentValue,
    previousValue,
    changePercent,
    threshold: {
      type: rule.thresholdType,
      value: rule.thresholdValue,
      direction: rule.direction,
    },
    target: { slug: event.targetSlug },
    project: { slug: event.projectSlug },
    organization: { slug: event.organizationSlug },
    // Always present so the payload shape stays stable; null when the Hive
    // Console URL isn't configured.
    url: buildAlertUrl(webAppUrl, event),
  };
}
