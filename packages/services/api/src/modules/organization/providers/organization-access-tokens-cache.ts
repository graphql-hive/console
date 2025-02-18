import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { REDIS_INSTANCE } from '../../shared/providers/redis';
import { findById, type OrganizationAccessToken } from './organization-access-tokens';

/**
 * Cache for performant OrganizationAccessToken lookups.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class OrganizationAccessTokensCache {
  private findById: ReturnType<typeof findById>;
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) redis: Redis,
    @Inject(PG_POOL_CONFIG) pool: DatabasePool,
    logger: Logger,
  ) {
    this.findById = findById({ pool, logger });
    this.cache = new BentoCache({
      default: 'organizationAccessTokens',
      stores: {
        organizationAccessTokens: bentostore()
          .useL1Layer(
            memoryDriver({
              maxItems: 10_000,
              prefix: 'bentocache:organization-access-tokens',
            }),
          )
          .useL2Layer(
            redisDriver({ connection: redis, prefix: 'bentocache:organization-access-tokens' }),
          ),
      },
    });
  }

  get(id: string) {
    return this.cache.getOrSet({
      key: id,
      factory: () => this.findById(id),
      ttl: '5min',
      grace: '24h',
    });
  }

  add(token: OrganizationAccessToken) {
    return this.cache.set({
      key: token.id,
      value: token,
      ttl: '5min',
      grace: '24h',
    });
  }

  purge(token: OrganizationAccessToken) {
    return this.cache.delete({
      key: token.id,
    });
  }
}
