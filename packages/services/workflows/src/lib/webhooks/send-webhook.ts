import got from 'got';
import type { Logger } from '@graphql-hive/logger';

export type RequestBroker = {
  endpoint: string;
  signature: string;
};

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
  },
) {
  if (args.attempt < args.maxAttempts) {
    logger.debug('Calling webhook');

    try {
      if (!requestBroker) {
        await got.post(args.endpoint, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/json',
          },
          timeout: {
            request: 10_000,
          },
          json: args.data,
        });
        return;
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
          },
          body: JSON.stringify(args.data),
          resolveResponseBody: false,
        },
      });
    } catch (error) {
      logger.error('Failed to call webhook.');
      // so we can re-try
      throw error;
    }
  } else {
    logger.warn('Giving up on webhook.');
  }
}
