import { Inject, Injectable, Scope } from 'graphql-modules';
import LRU from 'lru-cache';
import { Logger } from '../../shared/providers/logger';
import {
  COMMERCE_TRPC_CLIENT,
  type CommerceTrpcClient,
  type CommerceTrpcClientInputs,
} from './commerce-client';

type RateLimitApiInput = CommerceTrpcClientInputs['rateLimit'];

const RETENTION_CACHE_TTL_IN_SECONDS = 120;

@Injectable({
  global: true,
  scope: Scope.Singleton,
})
export class RateLimitProvider {
  private logger: Logger;
  private retentionCache = new LRU<string, number>({
    max: 500,
    ttl: RETENTION_CACHE_TTL_IN_SECONDS * 1000,
    stale: false,
  });

  constructor(
    logger: Logger,
    @Inject(COMMERCE_TRPC_CLIENT) private client: CommerceTrpcClient,
  ) {
    this.logger = logger.child({ service: 'RateLimitProvider' });
  }

  async checkRateLimit(input: RateLimitApiInput['checkRateLimit']) {
    if (this.client === null) {
      this.logger.warn(
        `Unable to check rate-limit for input: %o , service information is not available`,
        input,
      );

      return {
        usagePercentage: 0,
        limited: false,
      };
    }

    this.logger.debug(`Checking rate limit for target id="${input.id}", type=${input.type}`);

    return await this.client.rateLimit.checkRateLimit.query(input);
  }

  async getRetention(input: RateLimitApiInput['getRetention']) {
    if (this.client === null) {
      return null;
    }

    if (this.retentionCache.has(input.targetId)) {
      return this.retentionCache.get(input.targetId);
    }

    this.logger.debug(`Fetching retention for target id="${input.targetId}"`);

    const value = await this.client.rateLimit.getRetention.query(input);
    this.retentionCache.set(input.targetId, value);

    return value;
  }
}
