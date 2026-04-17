import type { Logger } from '@graphql-hive/logger';
import type { PostgresDatabasePool } from '@hive/postgres';
import { psql } from '@hive/postgres';
import { WebClient } from '@slack/web-api';
import type { MetricAlertRuleRow } from './metric-alert-evaluator.js';
import { sendWebhook, type RequestBroker } from './webhooks/send-webhook.js';

type AlertChannelRow = {
  id: string;
  type: 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK';
  name: string;
  slackChannel: string | null;
  webhookEndpoint: string | null;
};

type NotificationEvent = {
  state: 'firing' | 'resolved';
  rule: MetricAlertRuleRow;
  currentValue: number;
  previousValue: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
};

export async function sendMetricAlertNotifications(args: {
  ruleId: string;
  event: NotificationEvent;
  pg: PostgresDatabasePool;
  requestBroker: RequestBroker | null;
  logger: Logger;
}): Promise<void> {
  const { ruleId, event, pg, logger } = args;

  // Fetch channels attached to this rule
  const channels = (await pg.any(psql`
    SELECT
      ac."id"
      , ac."type"
      , ac."name"
      , ac."slack_channel" as "slackChannel"
      , ac."webhook_endpoint" as "webhookEndpoint"
    FROM "alert_channels" ac
    INNER JOIN "metric_alert_rule_channels" marc
      ON marc."alert_channel_id" = ac."id"
    WHERE marc."metric_alert_rule_id" = ${ruleId}
  `)) as unknown as AlertChannelRow[];

  if (channels.length === 0) {
    logger.warn({ ruleId }, 'No channels configured for metric alert rule');
    return;
  }

  for (const channel of channels) {
    try {
      switch (channel.type) {
        case 'SLACK': {
          await sendSlackNotification({ channel, event, pg, logger });
          break;
        }
        case 'WEBHOOK': {
          await sendWebhookNotification({
            channel,
            event,
            requestBroker: args.requestBroker,
            logger,
          });
          break;
        }
        case 'MSTEAMS_WEBHOOK': {
          await sendTeamsNotification({
            channel,
            event,
            requestBroker: args.requestBroker,
            logger,
          });
          break;
        }
      }
    } catch (error) {
      logger.error(
        { error, channelId: channel.id, channelType: channel.type },
        'Failed to send metric alert notification',
      );
    }
  }
}

async function sendSlackNotification(args: {
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

  // Fetch the org's Slack token
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
  const color = isFiring ? '#E74C3C' : '#2ECC71';

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

async function sendWebhookNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  requestBroker: RequestBroker | null;
  logger: Logger;
}) {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Webhook endpoint not configured');
    return;
  }

  const payload = buildWebhookPayload(event);

  await sendWebhook(logger, args.requestBroker, {
    attempt: 0,
    maxAttempts: 5,
    endpoint: channel.webhookEndpoint,
    data: payload,
  });

  logger.debug({ channelId: channel.id }, 'Webhook notification sent');
}

async function sendTeamsNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  requestBroker: RequestBroker | null;
  logger: Logger;
}) {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Teams webhook endpoint not configured');
    return;
  }

  const isFiring = event.state === 'firing';
  const emoji = isFiring ? '🔴' : '✅';
  const action = isFiring ? 'triggered' : 'resolved';
  const themeColor = isFiring ? 'E74C3C' : '2ECC71';

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
    attempt: 0,
    maxAttempts: 5,
    endpoint: channel.webhookEndpoint,
    data: card,
  });

  logger.debug({ channelId: channel.id }, 'Teams notification sent');
}

function formatChangeText(event: NotificationEvent): string {
  const { rule, currentValue, previousValue } = event;
  const unit = rule.type === 'LATENCY' ? 'ms' : rule.type === 'ERROR_RATE' ? '%' : ' requests';
  const metricLabel =
    rule.type === 'LATENCY'
      ? `${rule.metric} latency`
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
