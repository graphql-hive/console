import { LRUCache } from 'lru-cache';
import ms from 'ms';
import type { RateLimitApi } from '@hive/rate-limit';
import { ServiceLogger } from '@hive/service-common';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { rateLimitDuration } from './metrics';

interface IsRateLimitedInput {
  targetId: string;
  token: string;
}

export function createUsageRateLimit(config: { endpoint: string | null; logger: ServiceLogger }) {
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
  const rateLimit = createTRPCProxyClient<RateLimitApi>({
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

  const rateLimitCache = new LRUCache<
    {
      targetId: string;
      token: string;
    },
    boolean
  >({
    max: 1000,
    ttl: ms('30s'),
    allowStale: false,
    // If a cache entry is stale or missing, this method is called
    // to fill the cache with fresh data.
    // This method is called only once per cache key,
    // even if multiple requests are waiting for it.
    async fetchMethod({ targetId, token }) {
      const timer = rateLimitDuration.startTimer();
      const result = await rateLimit.checkRateLimit
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
    ttl: ms('30s'),
    // Allow to return stale data if the fetchMethod is slow
    allowStale: false,
    // If a cache entry is stale or missing, this method is called
    // to fill the cache with fresh data.
    // This method is called only once per cache key,
    // even if multiple requests are waiting for it.
    fetchMethod(targetId) {
      const timer = rateLimitDuration.startTimer();
      return rateLimit.getRetention.query({ targetId }).finally(() => {
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
      return (await rateLimitCache.fetch(input)) ?? false;
    },
  };
}
