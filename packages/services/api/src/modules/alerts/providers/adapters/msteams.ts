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

@Injectable()
export class TeamsCommunicationAdapter implements CommunicationAdapter {
  private logger: Logger;

  constructor(
    logger: Logger,
    @Inject(WEB_APP_URL) private appBaseUrl: string,
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
    const webhookUrl = input.integrations.teams?.webhookUrl;

    if (!webhookUrl) {
      this.logger.debug(`Microsoft Teams Integration is not available`);
      return;
    }

    try {
      const totalChanges = input.event.changes.length + input.event.messages.length;
      const projectLink = createMDLink({
        text: input.event.project.name,
        url: `${this.appBaseUrl}/${input.event.organization.cleanId}/${input.event.project.cleanId}`,
      });
      const targetLink = createMDLink({
        text: input.event.target.name,
        url: `${this.appBaseUrl}/${input.event.organization.cleanId}/${input.event.project.cleanId}/${input.event.target.cleanId}`,
      });
      const viewLink = createMDLink({
        text: 'view details',
        url: `${this.appBaseUrl}/${input.event.organization.cleanId}/${input.event.project.cleanId}/${input.event.target.cleanId}/history/${input.event.schema.id}`,
      });

      const message = input.event.initial
        ? `:bee: Hi, I received your *first* schema in project ${projectLink}, target ${targetLink} (${viewLink}):`
        : `:bee: Hi, I found *${totalChanges} ${this.pluralize(
            'change',
            totalChanges,
          )}* in project ${projectLink}, target ${targetLink} (${viewLink}):`;

      const attachments = input.event.initial
        ? []
        : createAttachments(input.event.changes, input.event.messages);

      await this.sendTeamsMessage(webhookUrl, message, attachments);
    } catch (error) {
      this.logger.error(`Failed to send Microsoft Teams notification`, error);
    }
  }

  async sendChannelConfirmation(input: ChannelConfirmationInput) {
    this.logger.debug(
      `Sending Channel Confirmation over Microsoft Teams (organization=%s, project=%s, channel=%s)`,
      input.event.organization.id,
      input.event.project.id,
    );

    const webhookUrl = input.integrations.teams?.webhookUrl;

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
        url: `${this.appBaseUrl}/${input.event.organization.cleanId}/${input.event.project.cleanId}`,
      });

      const message = [
        `:wave: Hi! I'm the notification :bee:.`,
        `${actionMessage} about your ${projectLink} project.`,
      ].join('\n');

      await this.sendTeamsMessage(webhookUrl, message);
    } catch (error) {
      this.logger.error(`Failed to send Microsoft Teams notification`, error);
    }
  }

  private pluralize(word: string, num: number): string {
    return word + (num > 1 ? 's' : '');
  }

  private async sendTeamsMessage(webhookUrl: string, message: string, attachments: any[] = []) {
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
          ...(attachments.length > 0 && { attachments: attachments }),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send Microsoft Teams message: ${response.statusText}`);
    }
  }
}

function createAttachments(changes: readonly SchemaChangeType[], messages: readonly string[]) {
  const breakingChanges = changes.filter(
    change => change.criticality === CriticalityLevel.Breaking,
  );
  const safeChanges = changes.filter(change => change.criticality !== CriticalityLevel.Breaking);

  const attachments: any[] = [];

  if (breakingChanges.length) {
    attachments.push(
      renderAttachments({
        color: '#E74C3B',
        title: 'Breaking changes',
        changes: breakingChanges,
      }),
    );
  }

  if (safeChanges.length) {
    attachments.push(
      renderAttachments({
        color: '#23B99A',
        title: 'Safe changes',
        changes: safeChanges,
      }),
    );
  }

  if (messages.length) {
    const text = messages.map(message => slackCoderize(message)).join('\n');
    attachments.push({
      color: '#1C8DC7',
      title: 'Other changes',
      text,
    });
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
  changes: readonly SchemaChangeType[];
}): any {
  const text = changes
    .map(change => {
      let text = change.message;
      if (change.isSafeBasedOnUsage) {
        text += ' (safe based on usage)';
      }

      return slackCoderize(text);
    })
    .join('\n');

  return {
    color,
    title,
    text,
  };
}
