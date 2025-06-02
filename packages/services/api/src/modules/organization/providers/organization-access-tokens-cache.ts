import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import type Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';
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
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) redis: Redis,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    prometheusConfig: PrometheusConfig,
  ) {
    this.cache = new BentoCache({
      default: 'organizationAccessTokens',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_organization_access_tokens',
            }),
          ]
        : undefined,
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

  get(
    id: string,
    /** Request scoped logger so we associate the request-id with any logs occuring during the SQL lookup. */
    logger: Logger,
  ) {
    return this.cache.getOrSet({
      key: id,
      factory: () => findById({ logger, pool: this.pool })(id),
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
