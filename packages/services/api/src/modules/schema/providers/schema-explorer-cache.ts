import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/drivers/memory';
import { redisDriver } from 'bentocache/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import {
  PROMETHEUS_CACHE_KEY_GROUPS,
  PrometheusConfig,
} from '../../shared/providers/prometheus-config';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';
import type { SchemaExplorerSnapshot } from '../lib/schema-explorer-snapshot';

/**
 * Bump when the shape of `SchemaExplorerSnapshot` changes, so stale entries are not read.
 */
const SNAPSHOT_FORMAT_VERSION = 1;

/**
 * Caches the schema explorer snapshot per schema version.
 * A schema version never changes after it is written, so entries never need invalidation;
 * the TTL only bounds memory.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaExplorerCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(@Inject(REDIS_INSTANCE) redis: Redis, prometheusConfig: PrometheusConfig) {
    const prefix = `bentocache:schemaExplorer:v${SNAPSHOT_FORMAT_VERSION}`;
    this.cache = new BentoCache({
      default: 'schemaExplorer',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_schemaExplorer',
              keyGroups: PROMETHEUS_CACHE_KEY_GROUPS,
            }),
          ]
        : undefined,
      stores: {
        schemaExplorer: bentostore()
          .useL1Layer(
            memoryDriver({
              // Snapshots of large schemas are several MB, so bound by size rather than count.
              maxSize: '256mb',
              prefix,
            }),
          )
          .useL2Layer(redisDriver({ connection: redis, prefix })),
      },
    });
  }

  /**
   * Concurrent calls for the same schema version share one `build`.
   */
  getOrBuild(
    schemaVersionId: string,
    build: () => Promise<SchemaExplorerSnapshot | null>,
  ): Promise<SchemaExplorerSnapshot | null> {
    return this.cache.getOrSet({
      key: schemaVersionId,
      factory: build,
      ttl: '1d',
    });
  }
}
