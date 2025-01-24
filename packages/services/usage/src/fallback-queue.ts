import pLimit from 'p-limit';
import type {ServiceLogger} from '@hive/service-common'

// Average message size is ~800kb
// 1000 messages = 800mb
const MAX_QUEUE_SIZE = 1000;

export function createFallbackQueue(config: {
  send: (msgValue: string, numOfOperations: number) => Promise<void>;
  logger: ServiceLogger;
}) {
  const queue: [string, number][] = [];

  async function flushSingle() {
    const msg = queue.shift();
      if (!msg) {
        return;
      }

      try {
        const [msgValue, numOfOperations] = msg;
        await config.send(msgValue, numOfOperations);
      } catch (error) {
        config.logger.error('Failed to flush message (error=%s)', error);
        if (error instanceof Error && 'type' in error && error.type === 'MESSAGE_TOO_LARGE') {
          config.logger.error('Message too large, dropping message');
          return;
        }

        queue.push(msg);
      }
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
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
      return Promise.allSettled(queue.map(msgValue => limit(() => config.send(msgValue[0], msgValue[1]).catch((error) => {
        config.logger.error('Failed to flush message before stopping (error=%s)', error);
      }))));
    },
    add(msgValue: string, numOfOperations: number) {
      if (queue.length >= MAX_QUEUE_SIZE) {
        config.logger.error('Queue is full, dropping oldest message');
        queue.shift();
      }

      queue.push([msgValue, numOfOperations]);
    },
    size() {
      return queue.length;
    }
  }
}
