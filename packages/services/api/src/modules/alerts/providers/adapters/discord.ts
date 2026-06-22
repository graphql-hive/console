import { Inject, Injectable } from 'graphql-modules';
import { CriticalityLevel } from '@graphql-inspector/core';
import { SchemaChangeType } from '@hive/storage';
import { Logger } from '../../../shared/providers/logger';
import { WEB_APP_URL } from '../../../shared/providers/tokens';
import {
  ChannelConfirmationInput,
  CommunicationAdapter,
  createMDLink,
  SchemaChangeNotificationInput,
  slackCoderize,
} from './common';

const DISCORD_RED = 0xe74c3c;
const DISCORD_GREEN = 0x2ecc71;
const DISCORD_BLUE = 0x5865f2;

const DISCORD_MAX_EMBEDS = 10;
const DISCORD_MAX_TITLE_LENGTH = 256;
const DISCORD_MAX_DESCRIPTION_LENGTH = 4096;
const DISCORD_MAX_FIELDS = 25;
const DISCORD_MAX_FIELD_NAME_LENGTH = 256;
const DISCORD_MAX_FIELD_VALUE_LENGTH = 1024;

type DiscordWebhookPayload = {
  username?: string;
  content?: string;
  embeds?: DiscordEmbed[];
  allowed_mentions?: {
    parse: string[];
  };
};

type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
};

type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

@Injectable()
export class DiscordCommunicationAdapter implements CommunicationAdapter {
  private logger: Logger;

  constructor(
    logger: Logger,
    @Inject(WEB_APP_URL) private appBaseUrl: string,
  ) {
    this.logger = logger.child({ service: 'DiscordCommunicationAdapter' });
  }

  async sendSchemaChangeNotification(input: SchemaChangeNotificationInput) {
    this.logger.debug(
      `Sending Schema Change Notifications over Discord (organization=%s, project=%s, target=%s)`,
      input.event.organization.id,
      input.event.project.id,
      input.event.target.id,
    );

    const webhookUrl = input.channel.webhookEndpoint;

    if (!webhookUrl) {
      this.logger.debug(`Discord Integration is not available`);
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
        ? `Hive received your first schema in project ${projectLink}, target ${targetLink} (${viewLink}).`
        : `Hive found **${totalChanges} ${this.pluralize(
            'change',
            totalChanges,
          )}** in project ${projectLink}, target ${targetLink} (${viewLink}).`;

      const detailsText = input.event.initial
        ? ''
        : createDetailsText(input.event.changes, input.event.messages, input.event.errors);

      const hasBreakingChanges = input.event.changes.some(
        change => change.criticality === CriticalityLevel.Breaking,
      );
      const hasErrors = input.event.errors.length > 0;

      await this.sendDiscordMessage(webhookUrl, {
        embeds: [
          {
            title: input.event.initial
              ? 'Schema published'
              : hasBreakingChanges || hasErrors
                ? 'Breaking schema changes detected'
                : 'Schema changes detected',
            url: changeUrl,
            color: hasBreakingChanges || hasErrors ? DISCORD_RED : DISCORD_GREEN,
            description: [message, detailsText].filter(Boolean).join('\n\n'),
            fields: [
              {
                name: 'Project',
                value: input.event.project.name || input.event.project.slug,
                inline: true,
              },
              {
                name: 'Target',
                value: input.event.target.name || input.event.target.slug,
                inline: true,
              },
              {
                name: 'Commit',
                value: input.event.schema.commit,
                inline: true,
              },
            ],
          },
        ],
      });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.toString()
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error(`Failed to send Discord notification (error=%s)`, errorText);
    }
  }

  async sendChannelConfirmation(input: ChannelConfirmationInput) {
    this.logger.debug(
      `Sending Channel Confirmation over Discord (organization=%s, project=%s, channel=%s)`,
      input.event.organization.id,
      input.event.project.id,
    );

    const webhookUrl = input.channel.webhookEndpoint;

    if (!webhookUrl) {
      this.logger.debug(`Discord Integration is not available`);
      return;
    }

    const actionMessage =
      input.event.kind === 'created'
        ? `I will send notifications here`
        : `I will no longer send notifications here`;

    try {
      const projectLink = createMDLink({
        text: input.event.project.name,
        url: `${this.appBaseUrl}/${input.event.organization.slug}/${input.event.project.slug}`,
      });

      await this.sendDiscordMessage(webhookUrl, {
        embeds: [
          {
            title: 'GraphQL Hive notifications',
            color: DISCORD_BLUE,
            description: `${actionMessage} about your ${projectLink} project.`,
          },
        ],
      });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.toString()
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error(`Failed to send Discord notification`, errorText);
    }
  }

  private pluralize(word: string, num: number): string {
    return word + (num > 1 ? 's' : '');
  }

  async sendDiscordMessage(webhookUrl: string, payload: DiscordWebhookPayload) {
    const normalizedPayload: DiscordWebhookPayload = {
      username: 'GraphQL Hive',
      ...payload,
      allowed_mentions: payload.allowed_mentions ?? { parse: [] },
      embeds: payload.embeds?.slice(0, DISCORD_MAX_EMBEDS).map(limitEmbed),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedPayload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send Discord message: ${response.statusText}`);
    }
  }
}

function createDetailsText(
  changes: readonly SchemaChangeType[],
  messages: readonly string[],
  errors: readonly { message: string }[],
): string {
  const breakingChanges = changes.filter(
    change => change.criticality === CriticalityLevel.Breaking,
  );
  const safeChanges = changes.filter(change => change.criticality !== CriticalityLevel.Breaking);

  const sections: string[] = [];

  if (breakingChanges.length) {
    sections.push(renderChangeList('Breaking changes', breakingChanges));
  }

  if (safeChanges.length) {
    sections.push(renderChangeList('Safe changes', safeChanges));
  }

  if (messages.length) {
    sections.push(`### Other changes\n${messages.map(message => slackCoderize(message)).join('\n')}`);
  }

  if (errors.length) {
    sections.push(`### Errors\n${errors.map(error => slackCoderize(error.message)).join('\n')}`);
  }

  return sections.join('\n');
}

function renderChangeList(title: string, changes: readonly SchemaChangeType[]): string {
  const text = changes
    .map(change => {
      let text = ` - ${change.message}`;
      if (change.isSafeBasedOnUsage) {
        text += ' (safe based on usage)';
      }

      return slackCoderize(text);
    })
    .join('\n');

  return `### ${title}\n${text}`;
}

function limitEmbed(embed: DiscordEmbed): DiscordEmbed {
  return {
    ...embed,
    title: embed.title ? truncate(embed.title, DISCORD_MAX_TITLE_LENGTH) : undefined,
    description: embed.description
      ? truncate(embed.description, DISCORD_MAX_DESCRIPTION_LENGTH)
      : undefined,
    fields: embed.fields?.slice(0, DISCORD_MAX_FIELDS).map(field => ({
      ...field,
      name: truncate(field.name, DISCORD_MAX_FIELD_NAME_LENGTH),
      value: truncate(field.value, DISCORD_MAX_FIELD_VALUE_LENGTH),
    })),
  };
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength - 3) + '...';
}
