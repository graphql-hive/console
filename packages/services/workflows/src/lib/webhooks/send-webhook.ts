import got from 'got';
import type { Logger } from '@graphql-hive/logger';

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
  },
): Promise<SendWebhookResult> {
  if (args.attempt < args.maxAttempts) {
    logger.debug('Calling webhook');

    try {
      if (!requestBroker) {
        await got.post(args.endpoint, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/json',
            ...args.headers,
          },
          timeout: {
            request: 10_000,
          },
          json: args.data,
        });
        return { status: 'sent' };
      }

      await got.post(requestBroker.endpoint, {
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
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/json',
            ...args.headers,
          },
          body: JSON.stringify(args.data),
          resolveResponseBody: false,
        },
      });

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
