import { timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { invariant, type FastifyRequest } from '@hive/service-common';
import { sha256 } from '../../auth/lib/supertokens-at-home/crypto';
import { Logger } from './logger';
import { REDIS_INSTANCE, type Redis } from './redis';
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

  private isRateLimitBypassed(req: FastifyRequest) {
    const cookies: undefined | Record<string, undefined | string> = (req as any).cookies;

    if (this.bypassKey !== null && cookies?.['sBypassRateLimitKey']) {
      const incomingBypassKey = Buffer.from(cookies['sBypassRateLimitKey']);

      if (
        this.bypassKey.length === incomingBypassKey.length &&
        timingSafeEqual(incomingBypassKey, this.bypassKey)
      ) {
        this.logger.debug('rate limit bypassed via provided key');
        return true;
      }
    }

    return false;
  }

  private resolveIP(req: FastifyRequest, config: Exclude<RateLimitConfig['config'], null>) {
    let ip = req.ip;

    if (config.ipHeaderName && req.headers[config.ipHeaderName]) {
      this.logger.debug('rate limit based on forwarded ip header %s', config.ipHeaderName);
      ip = req.headers[config.ipHeaderName] as string;
    }

    return ip;
  }

  private async applyRateLimit(
    ip: string,
    action: string,
    timeWindowSeconds: number,
    maxActionsPerTimeWindow: number,
  ) {
    const ipHash = sha256(ip);
    const key = `server-rate-limiter:${action}:${ipHash}`;

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

  async isActionRateLimited(
    req: FastifyRequest,
    actionName: string /** duration of the time window */,
    timeWindowSeconds = 5 * 60,
    /** maximum amount of requests allowed in the time window */
    maxActionsPerTimeWindow = 30,
  ) {
    if (!this.config.config) {
      this.logger.debug('rate limiting is disabled');
      return false;
    }

    if (this.isRateLimitBypassed(req)) {
      this.logger.debug('rate limiting is bypassed');
      return false;
    }

    const ip = this.resolveIP(req, this.config.config);
    return await this.applyRateLimit(ip, actionName, timeWindowSeconds, maxActionsPerTimeWindow);
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

    if (this.isRateLimitBypassed(req)) {
      this.logger.debug('rate limiting is bypassed');
      return false;
    }

    invariant(req.routeOptions.url, 'URL must exist.');
    const ip = this.resolveIP(req, this.config.config);

    return await this.applyRateLimit(
      ip,
      req.routeOptions.url,
      timeWindowSeconds,
      maxActionsPerTimeWindow,
    );
  }
}
