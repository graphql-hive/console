import type { RedisOptions } from 'ioredis';
import IORedis from 'ioredis';
import type { FastifyBaseLogger as ServiceLogger } from './fastify';
import { resolveRedisCredentials, startIamTokenRefresh, type IamRedisConfig } from './iam-redis';
import type { RedisConfig } from './redis-config';

type RedisInstance = IORedis;

/*
 * Re-exported ioredis `Redis` type for consumers that need to type a Redis client instance.
 */
export type Redis = IORedis;

/**
 * Connection configuration for creating a Redis client.
 */
export type RedisConnectionConfig = Required<Pick<RedisOptions, 'host' | 'port' | 'password'>> & {
  /** Whether to enable TLS for the Redis connection. */
  tlsEnabled: boolean;
  /** Optional Redis username for ACL-based authentication. */
  username?: string;
  /** When `true`, creates a `Redis.Cluster` client instead of a standalone client. */
  clusterModeEnabled?: boolean;
  /**
   * Maximum number of times a command will be retried before throwing.
   * Defaults to `null` (unlimited retries) when omitted.
   * Set to a positive number (e.g. `20`) for services that prefer bounded retries.
   */
  maxRetriesPerRequest?: number | null;
};

/**
 * Options for creating a Redis client.
 */
export type RedisClientOptions = {
  /** Logger instance for connection lifecycle events and errors. */
  logger: ServiceLogger;
  /**
   * Maximum number of times a command will be retried before throwing.
   * Defaults to `null` (unlimited retries) when omitted.
   */
  maxRetriesPerRequest?: number | null;
};

/**
 * Creates and configures a Redis client (standalone or cluster) with authentication,
 * retry strategies, reconnect-on-error handling, and lifecycle event logging.
 *
 * This function is the single public entry point for creating Redis clients across all services.
 * Each call to this function is fully independent:
 * - Credentials are resolved fresh via IAM or static password
 * - IAM token refresh (if enabled) is started per client with its own lifecycle
 *
 * @param config - Redis environment configuration (host, port, credentials, TLS, IAM settings).
 * @param options - Configuration options including logger and retry configuration.
 * @returns A Promise that resolves to a configured, ready-to-use Redis client instance.
 */
export async function createRedisClient(
  config: RedisConfig,
  options: RedisClientOptions,
): Promise<Redis> {
  // Derive IAM configuration from environment config if IAM is enabled
  const redisIamConfig: IamRedisConfig | undefined = config.awsIamAuthEnabled
    ? {
        host: config.host,
        port: config.port,
        awsRegion: config.awsRegion ?? '',
        username: config.username ?? 'default',
        iamAuthCacheName: config.awsIamAuthCacheName,
      }
    : undefined;

  // Resolve credentials (IAM tokens or static password)
  const { password, username: resolvedUsername } = await resolveRedisCredentials(
    config.password,
    options.logger,
    redisIamConfig,
  );

  // Create the Redis client instance with resolved credentials
  const redis = instantiateRedisClient(
    {
      host: config.host,
      port: config.port,
      password,
      username: resolvedUsername,
      tlsEnabled: config.tlsEnabled,
      clusterModeEnabled: config.clusterModeEnabled,
      maxRetriesPerRequest: options.maxRetriesPerRequest,
    },
    options.logger,
  );

  // Start IAM token refresh if enabled
  // Each client gets its own independent token lifecycle
  if (redisIamConfig) {
    startIamTokenRefresh(redis, redisIamConfig, options.logger);
  }

  return redis;
}

/**
 * Creates and configures a Redis client instance with retry strategies,
 * reconnect-on-error handling, and lifecycle event logging.
 *
 * This is an internal helper function. Use createRedisClient() as the public entry point.
 *
 * @param config - Redis connection configuration.
 * @param logger - Logger instance for connection lifecycle events.
 * @returns A configured, ready-to-use Redis client instance.
 */
function instantiateRedisClient(config: RedisConnectionConfig, logger: ServiceLogger) {
  const maxRetriesPerRequest = config.maxRetriesPerRequest ?? null;

  let redis: RedisInstance;
  if (config.clusterModeEnabled) {
    redis = new IORedis.Cluster([{ host: config.host, port: config.port }], {
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: {
        username: config.username,
        password: config.password,
        reconnectOnError(error) {
          logger.warn('Redis reconnectOnError (error=%s)', error);
          return 1;
        },
        maxRetriesPerRequest,
        enableReadyCheck: false,
        tls: config.tlsEnabled ? {} : undefined,
      },
      clusterRetryStrategy: (times: number) => Math.min(times * 500, 2000),
    }) as unknown as RedisInstance;
  } else {
    redis = new IORedis({
      host: config.host,
      port: config.port,
      password: config.password,
      username: config.username,
      retryStrategy(times) {
        return Math.min(times * 500, 2000);
      },
      reconnectOnError(error) {
        logger.warn('Redis reconnectOnError (error=%s)', error);
        return 1;
      },
      db: 0,
      maxRetriesPerRequest,
      enableReadyCheck: false,
      tls: config.tlsEnabled ? {} : undefined,
    });
  }

  redis.on('error', err => {
    logger.error('Redis connection error (error=%s)', err);
  });

  redis.on('connect', () => {
    logger.debug('Redis connection established');
  });

  redis.on('ready', () => {
    logger.info('Redis connection ready');
  });

  redis.on('close', () => {
    logger.info('Redis connection closed');
  });

  redis.on('reconnecting', (timeToReconnect?: number) => {
    logger.info('Redis reconnecting in %s', timeToReconnect);
  });

  return redis;
}
