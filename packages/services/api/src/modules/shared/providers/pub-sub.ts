import { InjectionToken } from 'graphql-modules';
import type { HivePubSub } from '@hive/pubsub';

export const PUB_SUB_CONFIG = new InjectionToken<HivePubSub>('PUB_SUB');
export type { HivePubSub };
