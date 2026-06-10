import { Cluster as RedisCluster } from 'ioredis';
import type { Redis as RedisStandalone } from 'ioredis';
import type { FastifyBaseLogger as ServiceLogger } from './fastify';
import { generatePresignedToken, startTokenRefreshTimer } from './iam-aws';

type RedisInstance = RedisStandalone | RedisCluster;

/**
 * ElastiCache Redis IAM authentication.
 *
 * Redis-specific helpers built on top of the generic iam-aws SigV4 presigning.
 * Handles ElastiCache token generation and in-place AUTH for standalone and
 * cluster connections.
 */

/**
 * Seconds to subtract from the 15-min SigV4 max TTL for ElastiCache refresh.
 *
 * A 3-minute buffer ensures the token is rotated well before expiry, giving
 * enough headroom for retry attempts if the first refresh fails.
 */
const ELASTICACHE_BACKOFF_REFRESH_SECONDS = 180;

/**
 * Configuration required to generate an ElastiCache IAM auth token.
 *
 * Passed to {@link generateIamAuthToken}, {@link startIamTokenRefresh}, and
 * {@link resolveRedisCredentials} to identify the Redis endpoint and IAM
 * user for SigV4 presigning.
 */
export interface IamRedisConfig {
  /** Redis endpoint hostname (e.g. `'my-cluster.abc123.use1.cache.amazonaws.com'`). */
  host: string;
  /** Redis endpoint port. */
  port: number;
  /** AWS region of the ElastiCache cluster (e.g. `'us-east-1'`). */
  awsRegion: string;
  /** ElastiCache Redis username that has IAM enabled. */
  username: string;
  /** ElastiCache cache name used as the hostname in the presigned URL. */
  iamAuthCacheName?: string;
}

/**
 * Generate a SigV4 pre-signed IAM auth token for ElastiCache Redis.
 *
 * Delegates to the generic {@link generatePresignedToken} with ElastiCache-specific
 * parameters (`service='elasticache'`, `Action='connect'`).
 *
 * @param config - ElastiCache endpoint and IAM user details.
 * @param logger - Logger with at least a `debug` method for tracing token generation.
 * @returns The signed token string (protocol prefix stripped) to pass as the Redis `AUTH` password.
 */
export async function generateIamAuthToken(
  config: IamRedisConfig,
  logger: ServiceLogger,
): Promise<string> {
  const cacheName = config.iamAuthCacheName || 'i-cannot-be-empty';

  logger.debug(
    'Generating SigV4 token (service=elasticache, hostname=%s, region=%s)',
    cacheName,
    config.awsRegion,
  );

  const token = await generatePresignedToken({
    service: 'elasticache',
    region: config.awsRegion,
    hostname: cacheName,
    query: {
      Action: 'connect',
      User: config.username,
    },
  });

  logger.debug('Generated SigV4 token (service=elasticache, length=%s)', token.length);
  return token;
}

/**
 * Re-authenticate active Redis connections with a fresh IAM token.
 *
 * In **cluster mode**, it iterates over every node returned by
 * `nodes('all')`, issues `AUTH` for each, and updates each
 * node's password only after successful authentication. Individual node
 * failures are logged as warnings but do not abort the loop.
 *
 * It also updates `options.redisOptions.password` when present so new
 * cluster connections use the refreshed token.
 *
 * In **standalone mode**, it issues a single `AUTH` command, then updates
 * the client's stored password when the options object is available.
 *
 * @param redis - The active ioredis client (standalone or cluster).
 * @param token - The fresh SigV4 IAM auth token.
 * @param username - The ElastiCache IAM username.
 * @param logger - Logger with `debug` and `warn` methods.
 */
export async function refreshIamAuth(
  redis: RedisInstance,
  token: string,
  username: string,
  logger: ServiceLogger,
): Promise<void> {
  if (redis instanceof RedisCluster) {
    const nodes = redis.nodes('all');
    logger.debug(
      'Refreshing IAM token (service=elasticache) — re-authenticating %s cluster node(s)',
      nodes.length,
    );
    for (const node of nodes) {
      node.options.password = token;
      try {
        await node.call('AUTH', username, token);
      } catch (err) {
        logger.warn('Failed to re-AUTH cluster node (service=elasticache, error=%s)', err);
      }
    }
    // Update cluster-level redisOptions for new node connections.
    if (redis.options?.redisOptions) {
      redis.options.redisOptions.password = token;
    }
  } else {
    redis.options.password = token;
    await redis.call('AUTH', username, token);
  }
  logger.debug('IAM token refreshed successfully (service=elasticache)');
}

/**
 * Start periodic IAM token rotation for an existing Redis connection.
 *
 * On each tick, generates a fresh SigV4 token via {@link generateIamAuthToken}
 * and re-authenticates with {@link refreshIamAuth}. The refresh interval is
 * `(900 - 180) = 720 s` (~12 minutes) plus 0-30 s jitter.
 *
 * Errors are retried up to 3 times with linear backoff. If all retries are
 * exhausted, an error is logged but the timer keeps running for the next cycle.
 *
 * @param redis - The active ioredis client to re-authenticate.
 * @param config - ElastiCache endpoint and IAM user details.
 * @param logger - Logger with `debug`, `warn`, and `error` methods.
 * @returns A cleanup function - call it during graceful shutdown to stop the
 *   refresh loop and prevent in-flight callbacks from executing on closed connections.
 */
export function startIamTokenRefresh(
  redis: RedisInstance,
  config: IamRedisConfig,
  logger: ServiceLogger,
): () => void {
  logger.debug('Starting ElastiCache IAM token refresh timer (region=%s)', config.awsRegion);

  return startTokenRefreshTimer(
    async (attempt, maxRetries) => {
      try {
        const token = await generateIamAuthToken(config, logger);
        await refreshIamAuth(redis, token, config.username, logger);
      } catch (error) {
        logger.error(
          'ElastiCache IAM token refresh failed (attempt=%s/%s, error=%s)',
          attempt,
          maxRetries,
          error,
        );
        if (attempt >= maxRetries) {
          logger.error('ElastiCache IAM token refresh exhausted all retries');
        }
        throw error;
      }
    },
    {
      backoffRefreshSeconds: ELASTICACHE_BACKOFF_REFRESH_SECONDS,
    },
  );
}

/**
 * Resolve Redis credentials, returns a static password or generates an IAM token.
 *
 * When `iamConfig` is provided, generates a SigV4 token via
 * {@link generateIamAuthToken} and returns it as the password alongside the
 * IAM username. Otherwise returns the static password with no username.
 *
 * @param staticPassword - The fallback password used when IAM is not configured.
 * @param logger - Logger with at least a `debug` method.
 * @param iamConfig - ElastiCache IAM config. When `undefined`, static password is used.
 * @returns An object with `password` (always present) and `username` (only when IAM is active).
 */
export async function resolveRedisCredentials(
  staticPassword: string,
  logger: ServiceLogger,
  iamConfig?: IamRedisConfig,
): Promise<{ password: string; username?: string }> {
  if (!iamConfig) {
    return { password: staticPassword };
  }

  const token = await generateIamAuthToken(iamConfig, logger);
  return { password: token, username: iamConfig.username };
}
