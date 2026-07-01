import type { Logger } from '@graphql-hive/logger';
import type { PostgresDatabasePool } from '@hive/postgres';
import { psql } from '@hive/postgres';
import { WebClient } from '@slack/web-api';
import type { MetricAlertRuleRow } from './metric-alert-evaluator.js';
import { sendWebhook, type RequestBroker } from './webhooks/send-webhook.js';

export type AlertChannelRow = {
  id: string;
  type: 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK' | 'DISCORD_WEBHOOK';
  name: string;
  slackChannel: string | null;
  webhookEndpoint: string | null;
};

export type NotificationEvent = {
  state: 'firing' | 'resolved';
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
  previousValue: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
};

export async function sendSlackNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  pg: PostgresDatabasePool;
  logger: Logger;
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

  await client.chat.postMessage({
    channel: channel.slackChannel,
    text: `${emoji} Metric alert ${action}: "${event.rule.name}"`,
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
}) {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Webhook endpoint not configured');
    return;
  }

  const payload = buildWebhookPayload(event);

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
        text: changeText,
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

export async function sendDiscordNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  requestBroker: RequestBroker | null;
  logger: Logger;
  idempotencyKey: string;
  attempt: number;
  maxAttempts: number;
}) {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Discord webhook endpoint not configured');
    return;
  }

  const isFiring = event.state === 'firing';
  const emoji = isFiring ? '🔴' : '✅';
  const action = isFiring ? 'triggered' : 'resolved';
  const color = Number.parseInt(isFiring ? severityColor(event.rule.severity) : RESOLVED_COLOR, 16);

  const changeText = formatChangeText(event);

  const payload = {
    username: 'GraphQL Hive',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: truncate(`${emoji} ${event.rule.name} — ${action}`, 256),
        color,
        description: truncate(changeText, 4096),
        fields: [
          { name: 'Type', value: event.rule.type, inline: true },
          { name: 'Severity', value: event.rule.severity, inline: true },
          {
            name: 'Target',
            value: truncate(`${event.targetSlug} in ${event.projectSlug}`, 1024),
            inline: false,
          },
        ],
      },
    ],
  };

  await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: payload,
    headers: { 'Idempotency-Key': args.idempotencyKey },
  });

  logger.debug({ channelId: channel.id }, 'Discord notification sent');
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
    const changePercent =
      previousValue !== 0
        ? (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
        : 'N/A';
    return `${metricLabel}: **${currentValue.toFixed(2)}${unit}** (was ${previousValue.toFixed(2)}${unit}, ${changePercent}% change) — Threshold: ${rule.direction.toLowerCase()} ${rule.thresholdValue}${rule.thresholdType === 'PERCENTAGE_CHANGE' ? '%' : unit}`;
  }

  return `${metricLabel}: **${currentValue.toFixed(2)}${unit}** (threshold: ${rule.thresholdValue}${rule.thresholdType === 'PERCENTAGE_CHANGE' ? '%' : unit})`;
}

function buildWebhookPayload(event: NotificationEvent) {
  const { rule, currentValue, previousValue } = event;
  const changePercent =
    previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : null;

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
  };
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength - 3) + '...';
}
