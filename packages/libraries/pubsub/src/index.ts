import { createPubSub } from 'graphql-yoga';
import { Redis } from 'ioredis';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import type { HivePubSub } from './pub-sub';

export * from './logger';

export function createHivePubSub(args: { publisher: Redis; subscriber: Redis }) {
  return createPubSub({
    eventTarget: createRedisEventTarget({
      publishClient: args.publisher,
      subscribeClient: args.subscriber,
    }),
  }) as HivePubSub;
}

export type { HivePubSub };
