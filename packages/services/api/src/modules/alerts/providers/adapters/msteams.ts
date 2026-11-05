import { Inject, Injectable } from 'graphql-modules';
import { CriticalityLevel } from '@graphql-inspector/core';
import { SchemaChangeType } from '@hive/storage';
import { Logger } from '../../../shared/providers/logger';
import { WEB_APP_URL } from '../../../shared/providers/tokens';
import { buildHiveWebhookHeaders } from '../../lib/delivery-metadata';
import {
  deliveryOutcome,
  DeliveryRecorder,
  TIMED_OUT,
  type DeliveryOutcome,
} from '../delivery-recorder';
import {
  ChannelConfirmationInput,
  CommunicationAdapter,
  createMDLink,
  SchemaChangeNotificationInput,
  slackCoderize,
} from './common';

@Injectable()
export class TeamsCommunicationAdapter implements CommunicationAdapter {
  private logger: Logger;

  constructor(
    logger: Logger,
    @Inject(WEB_APP_URL) private appBaseUrl: string,
    private deliveries: DeliveryRecorder,
  ) {
    this.logger = logger.child({ service: 'TeamsCommunicationAdapter' });
  }

  async sendSchemaChangeNotification(input: SchemaChangeNotificationInput) {
    this.logger.debug(
      `Sending Schema Change Notifications over Microsoft Teams (organization=%s, project=%s, target=%s)`,
      input.event.organization.id,
      input.event.project.id,
      input.event.target.id,
    );
    const webhookUrl = input.channel.webhookEndpoint;

    if (!webhookUrl) {
      this.logger.debug(`Microsoft Teams Integration is not available`);
      return;
    }

    try {
      const totalChanges = input.event.changes.length + input.event.messages.length;
      const projectLink = createMDLink({
        text: input.event.project.name,
        url: `${this.appBaseUrl}/${input.event.organization.slug}/${input.event.project.slug}`,
      });
      const targetLink = createMDLink({
        text: input.event.target.name,
        url: `${this.appBaseUrl}/${input.event.organization.slug}/${input.event.project.slug}/${input.event.target.slug}`,
      });
      const changeUrl = `${this.appBaseUrl}/${input.event.organization.slug}/${input.event.project.slug}/${input.event.target.slug}/history/${input.event.schema.id}`;
      const viewLink = createMDLink({
        text: 'view details',
        url: changeUrl,
      });

      const message = input.event.initial
        ? `🐝 Hi, I received your *first* schema in project ${projectLink}, target ${targetLink} (${viewLink}):`
        : `🐝 Hi, I found *${totalChanges} ${this.pluralize(
            'change',
            totalChanges,
          )}* in project ${projectLink}, target ${targetLink} (${viewLink}):`;

      const attachmentsText = input.event.initial
        ? ''
        : createAttachmentsText(input.event.changes, input.event.messages);

      const headers = buildHiveWebhookHeaders(
        this.deliveries.describe({
          event: 'schema_change',
          targetId: input.event.target.id,
          schemaId: input.event.schema.id,
          idempotencyKey: `schema-change:${input.event.schema.id}:${input.channel.id}`,
        }),
      );

      await this.deliveries.track(
        {
          organizationId: input.event.organization.id,
          deliveryType: 'MSTEAMS_WEBHOOK',
          destination: input.channel.id,
          event: 'schema_change',
          metadata: headers,
        },
        async () => ({
          outcome: await this.sendTeamsMessage(
            webhookUrl,
            `${message}\n\n${attachmentsText}`,
            createMDLink({
              text: 'view full report',
              url: changeUrl,
            }),
            headers,
          ),
          value: undefined,
        }),
        describeTeamsError,
      );
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.toString()
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error(`Failed to send Microsoft Teams notification (error=%s)`, errorText);
    }
  }

  async sendChannelConfirmation(input: ChannelConfirmationInput) {
    this.logger.debug(
      `Sending Channel Confirmation over Microsoft Teams (organization=%s, project=%s, channel=%s)`,
      input.event.organization.id,
      input.event.project.id,
    );

    const webhookUrl = input.channel.webhookEndpoint;

    if (!webhookUrl) {
      this.logger.debug(`Microsoft Teams Integration is not available`);
      return;
    }

    const actionMessage =
      input.event.kind === 'created'
        ? `I will send here notifications`
        : `I will no longer send here notifications`;

    try {
      const projectLink = createMDLink({
        text: input.event.project.name,
        url: `${this.appBaseUrl}/${input.event.organization.slug}/${input.event.project.slug}`,
      });

      const message = [
        `👋 Hi! I'm the notification 🐝.`,
        `${actionMessage} about your ${projectLink} project.`,
      ].join('\n');

      const headers = buildHiveWebhookHeaders(
        this.deliveries.describe({
          event: 'channel_confirmation',
          idempotencyKey: `channel-confirmation:${input.event.kind}:${input.channel.id}`,
        }),
      );

      await this.deliveries.track(
        {
          organizationId: input.event.organization.id,
          deliveryType: 'MSTEAMS_WEBHOOK',
          destination: input.channel.id,
          event: 'channel_confirmation',
          metadata: headers,
        },
        async () => ({
          outcome: await this.sendTeamsMessage(webhookUrl, message, undefined, headers),
          value: undefined,
        }),
        describeTeamsError,
      );
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.toString()
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error(`Failed to send Microsoft Teams notification (error=%s)`, errorText);
    }
  }

  private pluralize(word: string, num: number): string {
    return word + (num > 1 ? 's' : '');
  }

  /**
   * message gets truncated to max 27k characters-max payload size for Microsoft Teams is 28 KB
   */
  async sendTeamsMessage(
    webhookUrl: string,
    message: string,
    fullReportMdLink?: string,
    headers: Record<string, string> = {},
  ): Promise<DeliveryOutcome> {
    if (message.length > 27000) {
      message = message.slice(0, 27000) + `\n\n... message truncated. ${fullReportMdLink ?? ''}`;
    }

    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: 'Notification',
      themeColor: '0076D7',
      sections: [
        {
          activityTitle: 'Notification',
          text: message,
          markdown: true,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new TeamsWebhookError(response.status, response.statusText);
    }

    return { statusCode: response.status, statusText: response.statusText };
  }
}

/** A Microsoft Teams webhook answered with a non-2xx status. */
export class TeamsWebhookError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly statusText: string,
  ) {
    super(`Failed to send Microsoft Teams message: ${statusText}`);
    this.name = 'TeamsWebhookError';
  }
}

// With no signal on the call, a hung request ends only through undici's own timeouts: 10 s to
// connect, 300 s for the headers. They arrive wrapped in `TypeError: fetch failed` as `cause`,
// like a socket timeout; the body is never read, so its timeout cannot fire.
const FETCH_TIMEOUT_CODES = new Set([
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
]);

/**
 * The outcome of a failed webhook call: the status Teams answered, or a timeout of the request.
 * Null for anything else, which the recorder masks.
 */
export function describeTeamsError(error: unknown): DeliveryOutcome | null {
  if (error instanceof TeamsWebhookError) {
    return deliveryOutcome(error.statusCode, error.statusText);
  }
  const cause = isRecord(error) && isRecord(error.cause) ? error.cause : null;
  const code = typeof cause?.code === 'string' ? cause.code : null;
  return code !== null && FETCH_TIMEOUT_CODES.has(code) ? deliveryOutcome(null, TIMED_OUT) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createAttachmentsText(
  changes: readonly SchemaChangeType[],
  messages: readonly string[],
): string {
  const breakingChanges = changes.filter(
    change => change.criticality === CriticalityLevel.Breaking,
  );
  const safeChanges = changes.filter(change => change.criticality !== CriticalityLevel.Breaking);

  let text = '';

  if (breakingChanges.length) {
    text += renderChangeList({
      color: '#E74C3B',
      title: 'Breaking changes',
      changes: breakingChanges,
    });
  }

  if (safeChanges.length) {
    text += renderChangeList({
      color: '#23B99A',
      title: 'Safe changes',
      changes: safeChanges,
    });
  }

  if (messages.length) {
    text += `### Other changes\n${messages.map(message => slackCoderize(message)).join('\n')}\n`;
  }

  return text;
}

function renderChangeList({
  changes,
  title,
}: {
  color: string;
  title: string;
  changes: readonly SchemaChangeType[];
}): string {
  const text = changes
    .map(change => {
      let text = ` - ${change.message}`;
      if (change.isSafeBasedOnUsage) {
        text += ' (safe based on usage)';
      }

      return slackCoderize(text);
    })
    .join('\n');

  return `### ${title}\n${text}\n`;
}
