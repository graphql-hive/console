import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { PostgresDatabasePool } from '@hive/postgres';
import { TaskScheduler } from '@hive/workflows/kit';
import { PurgeTargetTokensTask } from '@hive/workflows/tasks/purge-target-tokens';
import type { Token } from '../../../shared/entities';
import { Logger } from '../../shared/providers/logger';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';
import { hashTargetToken, TargetTokenStorage } from './target-token-storage';

const targetTokenLastUsedRedisKeyPrefix = 'target-token:last-used';
const targetTokenLastUsedBucketTtlSeconds = 10 * 60;

function targetTokenLastUsedBucketKey(date: Date) {
  return `${targetTokenLastUsedRedisKeyPrefix}:${Math.floor(date.getTime() / 60_000)}`;
}

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class TargetTokenCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) private redis: Redis,
    private pool: PostgresDatabasePool,
    prometheusConfig: PrometheusConfig,
    private taskScheduler?: TaskScheduler,
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
        targetTokens: bentostore({ prefix: 'bentocache:target-tokens' })
          .useL1Layer(
            memoryDriver({
              maxItems: 10_000,
            }),
          )
          .useL2Layer(redisDriver({ connection: redis })),
      },
    });
  }

  async get(token: string, logger: Logger) {
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
          const lastUsedAt = new Date();
          const bucketKey = targetTokenLastUsedBucketKey(lastUsedAt);
          void this.redis
            .pipeline()
            .sadd(bucketKey, hashedToken)
            .expire(bucketKey, targetTokenLastUsedBucketTtlSeconds)
            .exec()
            .catch(err => logger.error('Failed to touch token. %s', err));
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

  async purge(tokens: string[]) {
    if (tokens.length === 0) {
      return;
    }

    if (!this.taskScheduler) {
      throw new Error('Target token cache purging is not available.');
    }

    await this.cache.deleteMany({ keys: tokens });
    await this.taskScheduler.scheduleTask(PurgeTargetTokensTask, { tokens });
  }
}
