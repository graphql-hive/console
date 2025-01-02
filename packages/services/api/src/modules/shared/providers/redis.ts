import { InjectionToken } from 'graphql-modules';
import type { Redis as RedisInstance, RedisOptions } from 'ioredis';
import Redis from 'ioredis';
import { Logger } from './logger';

export type { RedisInstance as Redis };

export type RedisConfig = Required<Pick<RedisOptions, 'host' | 'port' | 'password'>> & {
  tlsEnabled: boolean;
};

export const REDIS_INSTANCE = new InjectionToken<RedisInstance>('REDIS_INSTANCE');

export function createRedisClient(label: string, config: RedisConfig, logger: Logger) {
  const redis = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    retryStrategy(times) {
      return Math.min(times * 500, 2000);
    },
    reconnectOnError(error) {
      logger.warn('Redis reconnectOnError (error=%s)', error);
      return 1;
    },
    db: 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: config.tlsEnabled ? {} : undefined,
  });

  redis.on('error', err => {
    logger.error('Redis connection error (error=%s,label=%s)', err, label);
  });

  redis.on('connect', () => {
    logger.debug('Redis connection established (label=%s)', label);
  });

  redis.on('ready', () => {
    logger.info('Redis connection ready (label=%s)', label);
  });

  redis.on('close', () => {
    logger.info('Redis connection closed (label=%s)', label);
  });

  redis.on('reconnecting', (timeToReconnect?: number) => {
    logger.info('Redis reconnecting in %s (label=%s)', timeToReconnect, label);
  });

  return redis;
}
