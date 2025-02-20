import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import type Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { findTargetById } from '@hive/storage';
import type { Target } from '../../../shared/entities';
import { isUUID } from '../../../shared/is-uuid';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';
import { REDIS_INSTANCE } from '../../shared/providers/redis';

/**
 * Cache for performant Target lookups.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class TargetsByIdCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) redis: Redis,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    prometheusConfig: PrometheusConfig,
  ) {
    this.cache = new BentoCache({
      default: 'targetsById',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_targetsById',
            }),
          ]
        : undefined,
      stores: {
        targetsById: bentostore()
          .useL1Layer(
            memoryDriver({
              maxItems: 10_000,
              prefix: 'bentocache:targetsById',
            }),
          )
          .useL2Layer(redisDriver({ connection: redis, prefix: 'bentocache:targetsById' })),
      },
    });
  }

  get(id: string) {
    if (isUUID(id) === false) {
      return null;
    }

    return this.cache.getOrSet({
      key: id,
      factory: () => findTargetById({ pool: this.pool })(id),
      ttl: '5min',
      grace: '24h',
    });
  }

  purge(token: Target) {
    return this.cache.delete({
      key: token.id,
    });
  }
}
