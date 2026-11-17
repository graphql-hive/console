import { Injectable, Scope } from 'graphql-modules';
import { getRequestId } from '@hive/service-common';
import { TaskScheduler } from '@hive/workflows/kit';
import { SchemaChangeNotificationTask } from '@hive/workflows/tasks/schema-change-notification';
import { HiveHttpClientError, HttpClient } from '../../../shared/providers/http-client';
import { Logger } from '../../../shared/providers/logger';
import { HiveConsoleReleaseVersion, RequestBrokerConfig } from '../../../shared/providers/tokens';
import { buildHiveTestWebhookHeaders } from '../../lib/delivery-metadata';
import { createTestSchemaChangeEvent } from '../../lib/test-notification';
import { deliveryOutcome, TIMED_OUT, type DeliveryOutcome } from '../delivery-recorder';
import {
  attemptTestNotification,
  TEST_NOTIFICATION_TIMEOUT_MS,
  type CommunicationAdapter,
  type SchemaChangeNotificationInput,
  type TestNotificationInput,
} from './common';

@Injectable({
  scope: Scope.Operation,
})
export class WebhookCommunicationAdapter implements CommunicationAdapter {
  private logger: Logger;

  constructor(
    logger: Logger,
    private taskScheduler: TaskScheduler,
    private httpClient: HttpClient,
    private requestBroker: RequestBrokerConfig,
    private release: HiveConsoleReleaseVersion,
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

    await this.taskScheduler.scheduleTask(
      SchemaChangeNotificationTask,
      {
        endpoint: input.channel.webhookEndpoint!,
        event: input.event,
        channelId: input.channel.id,
      },
      // Forwarded to the destination as Hive-Request-ID by the task.
      { requestId: getRequestId() },
    );
  }

  async sendChannelConfirmation() {
    // I don't think we need to implement this for webhooks
  }

  /** Posts what the workflows task would, through the request broker when there is one. */
  async sendTestNotification(input: TestNotificationInput) {
    this.logger.debug(
      `Sending Test Notification over Webhook (organization=%s, project=%s)`,
      input.organization.id,
      input.project.id,
    );

    const { event } = SchemaChangeNotificationTask.schema.parse({
      endpoint: input.destination,
      event: createTestSchemaChangeEvent(input.organization, input.project),
    });
    const headers = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      ...buildHiveTestWebhookHeaders({
        requestId: getRequestId() ?? null,
        event: 'schema_change',
        targetId: event.target.id,
        schemaId: event.schema.id,
        release: this.release.valueOf(),
        idempotencyKey: input.idempotencyKey,
      }),
    };
    const options = {
      timeout: { request: TEST_NOTIFICATION_TIMEOUT_MS },
      context: { logger: this.logger },
    };
    const broker = this.requestBroker.config;

    return attemptTestNotification(
      this.logger,
      () =>
        broker
          ? this.httpClient.postWithResponse(broker.endpoint, {
              ...options,
              headers: { Accept: 'text/plain', 'x-hive-signature': broker.signature },
              json: {
                url: input.destination,
                method: 'POST',
                headers,
                body: JSON.stringify(event),
                resolveResponseBody: false,
              },
            })
          : this.httpClient.postWithResponse(input.destination, {
              ...options,
              headers,
              json: event,
            }),
      describeWebhookError,
    );
  }
}

function describeWebhookError(error: unknown): DeliveryOutcome | null {
  if (!(error instanceof HiveHttpClientError)) {
    return null;
  }
  if (error.statusCode !== undefined) {
    return deliveryOutcome(error.statusCode, error.statusText ?? '');
  }
  return error.code === 'ETIMEDOUT' ? deliveryOutcome(null, TIMED_OUT) : null;
}
