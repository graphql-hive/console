import got from 'got';
import type { Logger } from '@graphql-hive/logger';
import {
  deliveryOutcome,
  TIMED_OUT,
  trackDelivery,
  type DeliveryMeta,
  type DeliveryOutcome,
  type DeliveryRecorder,
} from '../delivery-recorder.js';

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
    delivery?: { recorder: DeliveryRecorder; meta: DeliveryMeta };
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
        await trackDelivery(args.delivery.recorder, args.delivery.meta, post, describeWebhookError);
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

/**
 * The outcome of a failed post: the status the endpoint answered, which got keeps on the
 * response (through the request broker, the broker relays the endpoint's status the same way),
 * or a timeout, got's own 10 s one or the socket's. Null for anything else, which the recorder
 * masks.
 */
export function describeWebhookError(error: unknown): DeliveryOutcome | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const { code, response } = error as { code?: unknown; response?: unknown };
  if (code === 'ERR_NON_2XX_3XX_RESPONSE' && typeof response === 'object' && response !== null) {
    const { statusCode, statusMessage } = response as {
      statusCode?: unknown;
      statusMessage?: unknown;
    };
    if (typeof statusCode === 'number') {
      return deliveryOutcome(statusCode, typeof statusMessage === 'string' ? statusMessage : '');
    }
  }
  return code === 'ETIMEDOUT' ? deliveryOutcome(null, TIMED_OUT) : null;
}
