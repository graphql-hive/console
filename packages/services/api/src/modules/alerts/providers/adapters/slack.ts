import { Injectable } from 'graphql-modules';
import { WebClient, MessageAttachment } from '@slack/web-api';
import {
  CommunicationAdapter,
  SchemaChangeNotificationInput,
  filterChangesByLevel,
  slackCoderize,
  ChannelConfirmationInput,
} from './common';
import type * as Types from '../../../../__generated__/types';
import { Logger } from '../../../shared/providers/logger';

@Injectable()
export class SlackCommunicationAdapter implements CommunicationAdapter {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ service: 'SlackCommunicationAdapter' });
  }

  private createLink({ text, url }: { text: string; url: string }) {
    return `<${url}|${text}>`;
  }

  async sendSchemaChangeNotification(input: SchemaChangeNotificationInput) {
    this.logger.debug(
      `Sending Schema Change Notifications over Slack (organization=%s, project=%s, target=%s)`,
      input.event.organization.id,
      input.event.project.id,
      input.event.target.id
    );

    if (!input.integrations.slack.token) {
      this.logger.debug(`Slack Integration is not available`);
      return;
    }

    try {
      const client = new WebClient(input.integrations.slack.token);

      const totalChanges = input.event.changes.length;
      const projectLink = this.createLink({
        text: input.event.project.name,
        url: `https://app.graphql-hive.com/${input.event.organization.cleanId}/${input.event.project.cleanId}`,
      });
      const targetLink = this.createLink({
        text: input.event.target.name,
        url: `https://app.graphql-hive.com/${input.event.organization.cleanId}/${input.event.project.cleanId}/${input.event.target.cleanId}`,
      });
      const viewLink = this.createLink({
        text: 'view details',
        url: `http://app.graphql-hive.com/${input.event.organization.cleanId}/${input.event.project.cleanId}/${input.event.target.cleanId}/history/${input.event.schema.id}`,
      });

      if (input.event.initial) {
        await client.chat.postMessage({
          channel: input.channel.slackChannel!,
          text: `:bee: Hi, I received your *first* schema in project ${projectLink}, target ${targetLink} (${viewLink}):`,
          mrkdwn: true,
        });
      } else {
        await client.chat.postMessage({
          channel: input.channel.slackChannel!,
          text: `:bee: Hi, I found *${totalChanges} ${this.pluralize(
            'change',
            totalChanges
          )}* in project ${projectLink}, target ${targetLink} (${viewLink}):`,
          mrkdwn: true,
          attachments: createAttachments(input.event.changes),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send Slack notification`, error);
    }
  }

  async sendChannelConfirmation(input: ChannelConfirmationInput) {
    this.logger.debug(
      `Sending Channel Confirmation over Slack (organization=%s, project=%s)`,
      input.event.organization.id,
      input.event.project.id
    );

    const token = input.integrations.slack.token;

    if (!token) {
      this.logger.debug(`Slack Integration is not available`);
      return;
    }

    const actionMessage =
      input.event.kind === 'created' ? `I will send here notifications` : `I will no longer send here notifications`;

    try {
      const projectLink = this.createLink({
        text: input.event.project.name,
        url: `https://app.graphql-hive.com/${input.event.organization.cleanId}/${input.event.project.cleanId}`,
      });

      const client = new WebClient(token);
      await client.chat.postMessage({
        channel: input.channel.slackChannel!,
        text: [`:wave: Hi! I'm the notification :bee:.`, `${actionMessage} about your ${projectLink} project.`].join(
          '\n'
        ),
      });
    } catch (error) {
      this.logger.error(`Failed to send Slack notification`, error);
    }
  }

  private pluralize(word: string, num: number): string {
    return word + (num > 1 ? 's' : '');
  }
}

function createAttachments(changes: readonly Types.SchemaChange[]) {
  const breakingChanges = changes.filter(filterChangesByLevel('Breaking'));
  const dangerousChanges = changes.filter(filterChangesByLevel('Dangerous'));
  const safeChanges = changes.filter(filterChangesByLevel('Safe'));

  const attachments: MessageAttachment[] = [];

  if (breakingChanges.length) {
    attachments.push(
      renderAttachments({
        color: '#E74C3B',
        title: 'Breaking changes',
        changes: breakingChanges,
      })
    );
  }

  if (dangerousChanges.length) {
    attachments.push(
      renderAttachments({
        color: '#F0C418',
        title: 'Dangerous changes',
        changes: dangerousChanges,
      })
    );
  }

  if (safeChanges.length) {
    attachments.push(
      renderAttachments({
        color: '#23B99A',
        title: 'Safe changes',
        changes: safeChanges,
      })
    );
  }

  return attachments;
}

function renderAttachments({
  changes,
  title,
  color,
}: {
  color: string;
  title: string;
  changes: readonly Types.SchemaChange[];
}): MessageAttachment {
  const text = changes.map(change => slackCoderize(change.message)).join('\n');

  return {
    mrkdwn_in: ['text'],
    color,
    author_name: title,
    text,
    fallback: text,
  };
}
