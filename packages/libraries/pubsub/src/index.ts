import { createPubSub } from 'graphql-yoga';
import { Redis } from 'ioredis';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import { bridgeGraphileLogger, type Logger } from './logger.js';
import type { HivePubSub } from './pub-sub.js';

export function createHivePubSub(args: { publisher: Redis; subscriber: Redis }) {
  return createPubSub({
    eventTarget: createRedisEventTarget({
      publishClient: args.publisher,
      subscribeClient: args.subscriber,
    }),
  }) as HivePubSub;
}

export { type HivePubSub, type Logger, bridgeGraphileLogger };
