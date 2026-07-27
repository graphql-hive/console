import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { PostgresDatabasePool } from '@hive/postgres';
import type { Token } from '../../../shared/entities';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';
import { hashTargetToken, TargetTokenStorage } from './target-token-storage';

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class TargetTokenCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) redis: Redis,
    private pool: PostgresDatabasePool,
    prometheusConfig: PrometheusConfig,
  ) {
    this.cache = new BentoCache({
      default: 'targetTokens',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_target_tokens',
            }),
          ]
        : undefined,
      stores: {
        targetTokens: bentostore()
          .useL1Layer(
            memoryDriver({
              maxItems: 10_000,
              prefix: 'bentocache:target-tokens',
            }),
          )
          .useL2Layer(redisDriver({ connection: redis, prefix: 'bentocache:target-tokens' })),
      },
    });
  }

  async get(token: string) {
    const hashedToken = hashTargetToken(token);

    return await this.cache
      .getOrSet({
        key: hashedToken,
        factory: () => TargetTokenStorage.findByHash({ pool: this.pool })(hashedToken),
        ttl: '5min',
        grace: '24h',
      })
      .then(result => {
        if (result) {
          void TargetTokenStorage.touchTokenByHash({ pool: this.pool })(hashedToken).catch(
            () => {},
          );
        }
        return result;
      });
  }

  async add(record: Token) {
    return await this.cache.set({
      key: record.token,
      value: record,
      ttl: '5min',
      grace: '24h',
    });
  }

  async purge(tokens: readonly string[]) {
    await Promise.all(tokens.map(token => this.cache.delete({ key: token })));
  }
}
