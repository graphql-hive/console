import type { Logger } from '@graphql-hive/logger';
import type { PostgresDatabasePool } from '@hive/postgres';
import { psql } from '@hive/postgres';
import type { Encryptor } from '@hive/service-common';
import { WebClient } from '@slack/web-api';
import {
  SLACK_OK,
  trackDelivery,
  type AlertChannelDeliveryRecorder,
  type DeliveryMeta,
} from './alert-channel-delivery-recorder.js';
import {
  buildHiveSlackMetadata,
  buildHiveWebhookHeaders,
  flattenSlackMetadata,
} from './delivery-metadata.js';
import type { MetricAlertRuleRow } from './metric-alert-evaluator.js';
import { sendWebhook, type RequestBroker } from './webhooks/send-webhook.js';

export type AlertChannelRow = {
  id: string;
  type: 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK' | 'DISCORD';
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
  targetId: string;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
};

/** How a sender records its attempt and identifies the call to the destination. */
export type DeliveryTracking = {
  recorder: AlertChannelDeliveryRecorder;
  /** Hive release, for the User-Agent. */
  release: string;
  requestId: string;
};

// The client default retries 10 times over about 30 minutes; graphile-worker already retries the
// job, and each recorded delivery should stand for a handful of calls at most.
const SLACK_CLIENT_OPTIONS = { retryConfig: { retries: 3 } };

function hiveHeaders(
  args: { tracking: DeliveryTracking; idempotencyKey: string },
  event: NotificationEvent,
): Record<string, string> {
  return buildHiveWebhookHeaders({
    requestId: args.tracking.requestId,
    event: 'metric_alert',
    targetId: event.targetId,
    release: args.tracking.release,
    idempotencyKey: args.idempotencyKey,
  });
}

function deliveryMeta(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  attempt: number;
  metadata: Record<string, string>;
}): DeliveryMeta {
  return {
    organizationId: args.event.rule.organizationId,
    channelId: args.channel.id,
    channelType: args.channel.type,
    event: 'metric_alert',
    attempt: args.attempt,
    metadata: args.metadata,
  };
}

/**
 * How a dispatch attempt ended. Only `sent` means the destination actually received
 * something: `skipped-config` covers a channel that is missing the settings it needs,
 * `failed-config` a misconfiguration retrying cannot fix (no or wrong ENCRYPTION_SECRET),
 * and `gave-up` an exhausted retry budget. All three used to be indistinguishable from a
 * successful send.
 */
export type NotificationResult =
  | { status: 'sent' }
  | { status: 'skipped-config'; reason: string }
  | { status: 'failed-config'; reason: string }
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
    case 'failed-config':
      return { outcome: 'failed-config', delivered: false, reason: result.reason };
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
  crypto: Encryptor | null;
  tracking: DeliveryTracking;
  attempt: number;
  idempotencyKey: string;
}): Promise<NotificationResult> {
  const { channel, event, pg, logger } = args;

  if (!channel.slackChannel) {
    logger.warn({ channelId: channel.id }, 'Slack channel name not configured');
    return { status: 'skipped-config', reason: 'no-slack-channel' };
  }
  const slackChannel = channel.slackChannel;

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

  if (!args.crypto) {
    logger.warn(
      { organizationId: event.rule.organizationId },
      'ENCRYPTION_SECRET not configured, cannot decrypt the Slack token',
    );
    return { status: 'failed-config', reason: 'no-encryption-secret' };
  }

  let token: string;
  try {
    // Written encrypted by the API's SlackIntegrationManager. `possiblyRaw` because rows
    // predating encryption are still stored in plain text, and the API tolerates them too.
    token = args.crypto.decrypt(tokenResult as string, true);
  } catch (error) {
    // A wrong ENCRYPTION_SECRET can't be fixed by retrying, so this must not throw:
    // rethrowing would burn the job's whole retry budget on an unfixable error.
    logger.error(
      {
        organizationId: event.rule.organizationId,
        // Node's crypto errors describe the failure without echoing the input, so this
        // is safe to log; the token and the ciphertext never are.
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to decrypt the Slack token, check ENCRYPTION_SECRET matches the API service',
    );
    return { status: 'failed-config', reason: 'decrypt-failed' };
  }

  const client = new WebClient(token, SLACK_CLIENT_OPTIONS);

  const isFiring = event.state === 'firing';
  const action = isFiring ? 'triggered' : 'resolved';
  // Slack renders the named presets (`good`/`warning`/`danger`) as the default
  // grey bar, so both states pass an explicit hex.
  const color = `#${isFiring ? severityColor(event.rule.severity) : RESOLVED_COLOR}`;

  const changeText = formatChangeText(event);
  const alertUrl = buildAlertUrl(args.webAppUrl, event);

  const metadata = buildHiveSlackMetadata({
    requestId: args.tracking.requestId,
    event: 'metric_alert',
    targetId: event.targetId,
    release: args.tracking.release,
    idempotencyKey: args.idempotencyKey,
  });

  await trackDelivery(
    args.tracking.recorder,
    deliveryMeta({
      channel,
      event,
      attempt: args.attempt,
      metadata: flattenSlackMetadata(metadata),
    }),
    async () => ({
      outcome: SLACK_OK,
      value: await client.chat.postMessage({
        channel: slackChannel,
        text: `Metric alert ${action}: "${event.rule.name}"`,
        metadata,
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
      }),
    }),
  );

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
  tracking: DeliveryTracking;
}): Promise<NotificationResult> {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Webhook endpoint not configured');
    return { status: 'skipped-config', reason: 'no-webhook-endpoint' };
  }

  const payload = buildWebhookPayload(event, args.webAppUrl);

  const headers = hiveHeaders(args, event);
  const result = await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: payload,
    headers,
    delivery: {
      recorder: args.tracking.recorder,
      meta: deliveryMeta({ channel, event, attempt: args.attempt, metadata: headers }),
    },
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
  tracking: DeliveryTracking;
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

  const headers = hiveHeaders(args, event);
  const result = await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: card,
    headers,
    delivery: {
      recorder: args.tracking.recorder,
      meta: deliveryMeta({ channel, event, attempt: args.attempt, metadata: headers }),
    },
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

// Discord rejects the whole message if any of these are exceeded. Mirrored in
// the schema-change adapter (api/modules/alerts/providers/adapters/discord.ts);
// kept local rather than shared so the two services stay independent.
const DISCORD_MAX_TITLE_LENGTH = 256;
const DISCORD_MAX_DESCRIPTION_LENGTH = 4096;
const DISCORD_MAX_FIELD_VALUE_LENGTH = 1024;

export async function sendDiscordNotification(args: {
  channel: AlertChannelRow;
  event: NotificationEvent;
  requestBroker: RequestBroker | null;
  logger: Logger;
  idempotencyKey: string;
  attempt: number;
  maxAttempts: number;
  webAppUrl: string | null;
  tracking: DeliveryTracking;
}): Promise<NotificationResult> {
  const { channel, event, logger } = args;

  if (!channel.webhookEndpoint) {
    logger.warn({ channelId: channel.id }, 'Discord webhook endpoint not configured');
    return { status: 'skipped-config', reason: 'no-discord-endpoint' };
  }

  const isFiring = event.state === 'firing';
  const emoji = isFiring ? '🔴' : '✅';
  const action = isFiring ? 'triggered' : 'resolved';
  const color = Number.parseInt(isFiring ? severityColor(event.rule.severity) : RESOLVED_COLOR, 16);

  const changeText = formatChangeText(event);
  const alertUrl = buildAlertUrl(args.webAppUrl, event);
  // Appended after truncation so the link survives a long change text.
  const viewLink = alertUrl ? `\n\n[View alert in Hive](${alertUrl})` : '';

  const payload = {
    username: 'GraphQL Hive',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: truncate(`${emoji} ${event.rule.name} — ${action}`, DISCORD_MAX_TITLE_LENGTH),
        // Makes the embed title itself clickable, as in the schema-change adapter.
        url: alertUrl ?? undefined,
        color,
        description:
          truncate(changeText, DISCORD_MAX_DESCRIPTION_LENGTH - viewLink.length) + viewLink,
        fields: [
          { name: 'Type', value: event.rule.type, inline: true },
          { name: 'Severity', value: event.rule.severity, inline: true },
          {
            name: 'Target',
            value: truncate(
              `${event.targetSlug} in ${event.projectSlug}`,
              DISCORD_MAX_FIELD_VALUE_LENGTH,
            ),
            inline: false,
          },
        ],
      },
    ],
  };

  const headers = hiveHeaders(args, event);
  const result = await sendWebhook(logger, args.requestBroker, {
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    endpoint: channel.webhookEndpoint,
    data: payload,
    headers,
    delivery: {
      recorder: args.tracking.recorder,
      meta: deliveryMeta({ channel, event, attempt: args.attempt, metadata: headers }),
    },
  });

  if (result.status === 'gave-up') {
    return result;
  }

  logger.debug({ channelId: channel.id }, 'Discord notification sent');

  return { status: 'sent' };
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

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength - 3) + '...';
}
