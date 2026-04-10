import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import type Redis from 'ioredis';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { PostgresDatabasePool } from '@hive/postgres';
import { findTargetBySlug } from '@hive/storage';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';
import { REDIS_INSTANCE } from '../../shared/providers/redis';

/**
 * Cache for performant Target lookups.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class TargetsBySlugCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) redis: Redis,
    private pool: PostgresDatabasePool,
    prometheusConfig: PrometheusConfig,
  ) {
    this.cache = new BentoCache({
      default: 'targetsBySlug',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_targetsBySlug',
            }),
          ]
        : undefined,
      stores: {
        targetsBySlug: bentostore()
          .useL1Layer(
            memoryDriver({
              maxItems: 10_000,
              prefix: 'bentocache:targetsBySlug',
            }),
          )
          .useL2Layer(redisDriver({ connection: redis, prefix: 'bentocache:targetsBySlug' })),
      },
    });
  }

  get(selector: { organizationSlug: string; projectSlug: string; targetSlug: string }) {
    return this.cache.getOrSet({
      key: `${selector.organizationSlug}/${selector.projectSlug}/${selector.targetSlug}`,
      factory: () => findTargetBySlug({ pool: this.pool })(selector),
      ttl: '5min',
      grace: '24h',
    });
  }
}
