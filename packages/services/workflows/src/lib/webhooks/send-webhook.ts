import got from 'got';
import type { Logger } from '@graphql-hive/logger';
import {
  trackDelivery,
  type AlertChannelDeliveryRecorder,
  type DeliveryMeta,
} from '../alert-channel-delivery-recorder.js';

export type RequestBroker = {
  endpoint: string;
  signature: string;
};

export type SendWebhookResult = { status: 'sent' } | { status: 'gave-up' };

export async function sendWebhook(
  logger: Logger,
  requestBroker: RequestBroker | null,
  args: {
    attempt: number;
    maxAttempts: number;
    /** endpoint to be called */
    endpoint: string;
    /** JSON data to be sent to the endpoint */
    data: unknown;
    /** extra headers to forward to the destination (e.g. Idempotency-Key) */
    headers?: Record<string, string>;
    /** When set, the attempt (delivered or failed) is recorded in ClickHouse. */
    delivery?: { recorder: AlertChannelDeliveryRecorder; meta: DeliveryMeta };
  },
): Promise<SendWebhookResult> {
  if (args.attempt < args.maxAttempts) {
    logger.debug('Calling webhook');

    const destinationHeaders = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      ...args.headers,
    };

    const post = async () => {
      const response = requestBroker
        ? await got.post(requestBroker.endpoint, {
            headers: {
              Accept: 'text/plain',
              'x-hive-signature': requestBroker.signature,
            },
            timeout: {
              request: 10_000,
            },
            json: {
              url: args.endpoint,
              method: 'POST',
              headers: destinationHeaders,
              body: JSON.stringify(args.data),
              resolveResponseBody: false,
            },
          })
        : await got.post(args.endpoint, {
            headers: destinationHeaders,
            timeout: {
              request: 10_000,
            },
            json: args.data,
          });

      return {
        outcome: { statusCode: response.statusCode, statusText: response.statusMessage ?? '' },
        value: undefined,
      };
    };

    try {
      if (args.delivery) {
        await trackDelivery(args.delivery.recorder, args.delivery.meta, post);
      } else {
        await post();
      }
      return { status: 'sent' };
    } catch (error) {
      logger.error('Failed to call webhook.');
      // so we can re-try
      throw error;
    }
  }

  // The final attempt never actually posts: graphile-worker increments `attempts`
  // before running, so this branch is reached on attempt === maxAttempts. Reported
  // as `gave-up` rather than swallowed, so an exhausted retry budget stops looking
  // like a successful delivery.
  logger.warn('Giving up on webhook.');
  return { status: 'gave-up' };
}
