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
}) {
  const { channel, event, pg, logger } = args;

  if (!channel.slackChannel) {
    logger.warn({ channelId: channel.id }, 'Slack channel name not configured');
    return;
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
    return;
  }

  const token = tokenResult as string;
  const client = new WebClient(token);

  const isFiring = event.state === 'firing';
  const emoji = isFiring ? ':rotating_light:' : ':white_check_mark:';
  const action = isFiring ? 'triggered' : 'resolved';
  // `good` is Slack's preset for the resolved state — it renders Slack's own
  // green. Firing uses the severity hex (prefixed with `#`).
  const color = isFiring ? `#${severityColor(event.rule.severity)}` : 'good';

  const changeText = formatChangeText(event);
  const alertUrl = buildAlertUrl(args.webAppUrl, event);

  await client.chat.postMessage({
    channel: channel.slackChannel,
    text: `${emoji} Metric alert ${action}: "${event.rule.name}"`,
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
}) {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Webhook endpoint not configured');
    return;
  }

  const payload = buildWebhookPayload(event, args.webAppUrl);

  await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: payload,
    headers: { 'Idempotency-Key': args.idempotencyKey },
  });

  logger.debug({ channelId: channel.id }, 'Webhook notification sent');
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
}) {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Teams webhook endpoint not configured');
    return;
  }

  const isFiring = event.state === 'firing';
  const emoji = isFiring ? '🔴' : '✅';
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
        activityTitle: `${emoji} ${event.rule.name} — ${action}`,
        facts: [
          { name: 'Type', value: event.rule.type },
          { name: 'Severity', value: event.rule.severity },
          { name: 'Target', value: `${event.targetSlug} in ${event.projectSlug}` },
        ],
        text: alertUrl ? `${changeText}\n\n[View alert in Hive](${alertUrl})` : changeText,
      },
    ],
  };

  await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: card,
    headers: { 'Idempotency-Key': args.idempotencyKey },
  });

  logger.debug({ channelId: channel.id }, 'Teams notification sent');
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
 * Resolved-state green for MS Teams. Teams' `themeColor` must be a hex, so it
 * can't use Slack's `good` preset.
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
