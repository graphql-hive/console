import { InjectionToken } from 'graphql-modules';
import type { Redis, RedisConnectionConfig } from '@hive/service-common';

export type { Redis };
export { createRedisClient } from '@hive/service-common';
export type { RedisConnectionConfig as RedisConfig };

/**
 * Dependency Injection token for injecting the Redis client into graphql-modules providers.
 * This lives here rather than in @hive/service-common because it depends on
 * graphql-modules, which is specific to the API service.
 */
export const REDIS_INSTANCE = new InjectionToken<Redis>('REDIS_INSTANCE');
