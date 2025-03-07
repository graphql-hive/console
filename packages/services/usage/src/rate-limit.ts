import { LRUCache } from 'lru-cache';
import type { CommerceRouter } from '@hive/commerce';
import { ServiceLogger } from '@hive/service-common';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { rateLimitDuration } from './metrics';

interface IsRateLimitedInput {
  targetId: string;
  token: string;
}

type TargetId = string;
type Token = string;
// lru-cache does reference equality check on keys, so we can't use objects as keys.
type RateLimitedCacheKey = `${TargetId}::${Token}`;

const rateLimitCacheKey = {
  encodeCacheKey(input: IsRateLimitedInput): RateLimitedCacheKey {
    return `${input.targetId}::${input.token}` as RateLimitedCacheKey;
  },
  decodeCacheKey(key: string) {
    const [targetId, token] = key.split('::');

    if (!targetId || !token) {
      throw new Error('Invalid input. Expected format: "<targetId>::<token>"');
    }

    // Quick check if it's UUID v4.
    // Third group should start with '4'
    // It does not have to be a strict UUID v4 check,
    // we just need to make sure it's not the token instead.
    if (targetId.charAt(14) !== '4' || targetId.charAt(13) !== '-') {
      throw new Error('Invalid targetId. Expected UUID v4 format');
    }

    return {
      targetId,
      token,
    };
  },
};

export function createUsageRateLimit(
  config: {
    logger: ServiceLogger;
  } & (
    | {
        endpoint: string;
        ttlMs: number;
      }
    | {
        endpoint?: null;
        ttlMs?: null;
      }
  ),
) {
  const logger = config.logger;

  if (!config.endpoint) {
    logger.warn(`Usage service is not configured to use rate-limit (missing config)`);

    return {
      async isRateLimited(_input: IsRateLimitedInput): Promise<boolean> {
        return false;
      },
      async getRetentionForTargetId(_targetId: string): Promise<number | null> {
        return null;
      },
    };
  }
  const endpoint = config.endpoint.replace(/\/$/, '');
  const commerceClient = createTRPCProxyClient<CommerceRouter>({
    links: [
      httpLink({
        url: `${endpoint}/trpc`,
        fetch(input, init) {
          return fetch(input, {
            ...init,
            // Abort requests that take longer than 5 seconds
            signal: AbortSignal.timeout(5000),
          });
        },
        headers: {
          'x-requesting-service': 'usage',
        },
      }),
    ],
  });

  const rateLimitCache = new LRUCache<RateLimitedCacheKey, boolean>({
    max: 1000,
    ttl: config.ttlMs,
    allowStale: false,
    // If a cache entry is stale or missing, this method is called
    // to fill the cache with fresh data.
    // This method is called only once per cache key,
    // even if multiple requests are waiting for it.
    async fetchMethod(input) {
      const { targetId, token } = rateLimitCacheKey.decodeCacheKey(input);
      const timer = rateLimitDuration.startTimer();
      const result = await commerceClient.rateLimit.checkRateLimit
        .query({
          id: targetId,
          type: 'operations-reporting',
          token,
          entityType: 'target',
        })
        .finally(() => {
          timer({
            type: 'rate-limit',
          });
        });

      if (!result) {
        return false;
      }

      return result.limited;
    },
  });

  const retentionCache = new LRUCache<string, number>({
    max: 1000,
    ttl: config.ttlMs,
    // Allow to return stale data if the fetchMethod is slow
    allowStale: false,
    // If a cache entry is stale or missing, this method is called
    // to fill the cache with fresh data.
    // This method is called only once per cache key,
    // even if multiple requests are waiting for it.
    fetchMethod(targetId) {
      const timer = rateLimitDuration.startTimer();
      return commerceClient.rateLimit.getRetention.query({ targetId }).finally(() => {
        timer({
          type: 'retention',
        });
      });
    },
  });

  return {
    async getRetentionForTargetId(targetId: string) {
      return (await retentionCache.fetch(targetId)) ?? null;
    },
    async isRateLimited(input: IsRateLimitedInput) {
      return (await rateLimitCache.fetch(rateLimitCacheKey.encodeCacheKey(input))) ?? false;
    },
  };
}

export type UsageRateLimit = ReturnType<typeof createUsageRateLimit>;
