import { Injectable, Scope } from 'graphql-modules';
import { TaskScheduler } from '@hive/workflows/kit';
import { SchemaChangeNotificationTask } from '@hive/workflows/tasks/schema-change-notification';
import { Logger } from '../../../shared/providers/logger';
import type { CommunicationAdapter, SchemaChangeNotificationInput } from './common';

@Injectable({
  scope: Scope.Operation,
})
export class WebhookCommunicationAdapter implements CommunicationAdapter {
  private logger: Logger;

  constructor(
    logger: Logger,
    private taskScheduler: TaskScheduler,
  ) {
    this.logger = logger.child({ service: 'WebhookCommunicationAdapter' });
  }

  async sendSchemaChangeNotification(input: SchemaChangeNotificationInput) {
    this.logger.debug(
      `Sending Schema Change Notifications over Webhook (organization=%s, project=%s, target=%s)`,
      input.event.organization.id,
      input.event.project.id,
      input.event.target.id,
    );
    await this.taskScheduler.scheduleTask(SchemaChangeNotificationTask, {
      endpoint: input.channel.webhookEndpoint!,
      event: input.event,
    });
  }

  async sendChannelConfirmation() {
    // I don't think we need to implement this for webhooks
  }
}
