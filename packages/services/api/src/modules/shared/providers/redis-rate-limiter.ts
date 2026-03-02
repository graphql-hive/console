import { timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { type Redis } from 'ioredis';
import { type FastifyRequest } from '@hive/service-common';
import { sha256 } from '../../auth/lib/supertokens-at-home/crypto';
import { Logger } from './logger';
import { REDIS_INSTANCE } from './redis';
import { RateLimitConfig } from './tokens';

@Injectable({
  scope: Scope.Singleton,
})
export class RedisRateLimiter {
  private logger: Logger;
  private bypassKey: Buffer | null;

  constructor(
    @Inject(REDIS_INSTANCE) private redis: Redis,
    private config: RateLimitConfig,
    logger: Logger,
  ) {
    this.logger = logger.child({ module: 'RateLimiter' });
    this.bypassKey = config.config?.bypassKey ? Buffer.from(config.config.bypassKey) : null;
  }

  /**
   * Rate limit Fastify request based on the route definition path.
   */
  async isFastifyRouteRateLimited(
    req: FastifyRequest,
    /** duration of the time window */
    timeWindowSeconds = 5 * 60,
    /** maximum amount of requests allowed in the time window */
    maxActionsPerTimeWindow = 30,
  ) {
    if (!this.config.config) {
      this.logger.debug('rate limiting is disabled');
      return false;
    }

    const cookies: undefined | Record<string, undefined | string> = (req as any).cookies;

    if (this.bypassKey !== null && cookies?.['sBypassRateLimitKey']) {
      const incomingBypassKey = Buffer.from(cookies['sBypassRateLimitKey']);

      if (
        this.bypassKey.length === incomingBypassKey.length &&
        timingSafeEqual(incomingBypassKey, this.bypassKey)
      ) {
        this.logger.debug('rate limit bypassed via provided key');
        return false;
      }
    }

    req.routeOptions.url;

    let ip = req.ip;

    if (this.config.config.ipHeaderName && req.headers[this.config.config.ipHeaderName]) {
      this.logger.debug(
        'rate limit based on forwarded ip header %s',
        this.config.config.ipHeaderName,
      );
      ip = req.headers[this.config.config.ipHeaderName] as string;
    }

    const ipHash = sha256(ip);

    const key = `server-rate-limiter:${req.routeOptions.url}:${ipHash}`;

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, timeWindowSeconds);
    }
    if (current > maxActionsPerTimeWindow) {
      this.logger.debug('request is rate limited (ip_hash=%s)', ipHash);
      return true;
    }

    this.logger.debug('request is not rate limited (ip_hash=%s)', ipHash);
    return false;
  }
}
