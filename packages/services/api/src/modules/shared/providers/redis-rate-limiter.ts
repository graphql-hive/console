import { Inject, Injectable, Scope } from 'graphql-modules';
import { type Redis } from 'ioredis';
import { type FastifyRequest } from '@hive/service-common';
import { Logger } from './logger';
import { REDIS_INSTANCE } from './redis';
import { RateLimitConfig } from './tokens';

@Injectable({
  scope: Scope.Singleton,
})
export class RedisRateLimiter {
  logger: Logger;

  constructor(
    @Inject(REDIS_INSTANCE) private redis: Redis,
    private config: RateLimitConfig,
    logger: Logger,
  ) {
    this.logger = logger.child({ module: 'RateLimiter' });
  }

  /**
   * Rate limit Fastify request based on the route definition path.
   */
  async isFastifyRouteRateLimited(
    req: FastifyRequest,
    /** duration of the time window */
    timeWindowSeconds = 5 * 60,
    /** maximum amount of requests allowed in the time window */
    maxActionsPerTimeWindow = 10,
  ) {
    if (!this.config.config) {
      this.logger.debug('rate limiting is disabled');
      return false;
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

    const key = `server-rate-limiter:${req.routeOptions.url}:${ip}`;

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, timeWindowSeconds);
    }
    if (current > maxActionsPerTimeWindow) {
      this.logger.debug('request is rate limited');
      return true;
    }

    this.logger.debug('request is not rate limited');
    return false;
  }
}
