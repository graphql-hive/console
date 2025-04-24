import pLimit from 'p-limit';
import type { ServiceLogger } from '@hive/service-common';
import * as Sentry from '@sentry/node';

// Average message size is ~800kb
// 1000 messages = 800mb
const MAX_QUEUE_SIZE = 1000;

export function createFallbackQueue(config: {
  send: (msgValue: Buffer<ArrayBufferLike>, numOfOperations: number) => Promise<void>;
  logger: ServiceLogger;
}) {
  const queue: [Buffer<ArrayBufferLike>, number][] = [];

  async function flushSingle() {
    const msg = queue.shift();
    if (!msg) {
      return;
    }

    try {
      const [msgValue, numOfOperations] = msg;
      await config.send(msgValue, numOfOperations);
    } catch (error) {
      if (error instanceof Error && 'type' in error && error.type === 'MESSAGE_TOO_LARGE') {
        config.logger.error('Message too large, dropping message');
        return;
      }

      config.logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to flush message, adding back to fallback queue',
      );
      queue.push(msg);
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      await flushSingle();
      schedule();
    }, 200);
  }

  return {
    start() {
      schedule();
    },
    stop() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      const limit = pLimit(10);
      return Promise.allSettled(
        queue.map(msgValue =>
          limit(() =>
            config.send(msgValue[0], msgValue[1]).catch(error => {
              Sentry.setTags({
                message: 'Failed to flush message before stopping',
                numOfOperations: msgValue[1],
              });
              Sentry.captureException(error);
              config.logger.error(
                {
                  error: error instanceof Error ? error.message : String(error),
                },
                'Failed to flush message before stopping',
              );
            }),
          ),
        ),
      );
    },
    add(msgValue: Buffer<ArrayBufferLike>, numOfOperations: number) {
      if (queue.length >= MAX_QUEUE_SIZE) {
        config.logger.error('Queue is full, dropping oldest message');
        queue.shift();
      }

      queue.push([msgValue, numOfOperations]);
    },
    size() {
      return queue.length;
    },
  };
}
