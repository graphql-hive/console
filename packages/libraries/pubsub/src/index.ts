import { createPubSub } from 'graphql-yoga';
import { Redis } from 'ioredis';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import { HivePubSub } from './pub-sub';

export { HivePubSub } from './pub-sub';

export function createHivePubSub(args: { publisher: Redis; subscriber: Redis }) {
  return createPubSub({
    eventTarget: createRedisEventTarget({
      publishClient: args.publisher,
      subscribeClient: args.subscriber,
    }),
  }) as HivePubSub;
}
