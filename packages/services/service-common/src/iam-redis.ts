import { Cluster as RedisCluster } from 'ioredis';
import type { Redis as RedisStandalone } from 'ioredis';
import type { FastifyBaseLogger as ServiceLogger } from './fastify';
import { generatePresignedToken, startTokenRefreshTimer } from './iam-aws';

type RedisInstance = RedisStandalone | RedisCluster;

interface InternalRedisConnection {
  options: { password?: string };
}

interface ClusterWithInternalSubscriber {
  subscriber?: {
    getInstance(): InternalRedisConnection | null;
  };
}

/**
 * ElastiCache Redis IAM authentication.
 *
 * Redis-specific helpers built on top of the generic iam-aws SigV4 presigning.
 * Handles ElastiCache token generation and in-place AUTH for standalone and
 * cluster connections.
 */
 
/**
 * Extract the internal ClusterSubscriber's Redis instance from a Cluster.
 *
 * ioredis Cluster maintains a dedicated internal Redis connection for pub/sub
 * (the {@link https://github.com/redis/ioredis/blob/main/lib/cluster/ClusterSubscriber.ts | ClusterSubscriber})
 * that is **not** included in `nodes('all')`. When using IAM auth, the
 * subscriber copies the password by value at creation time, so it becomes
 * stale unless explicitly updated during token rotation.
 *
 * This function safely accesses the subscriber via runtime duck-typing so
 * that a change in ioredis internals degrades gracefully (returns `null`)
 * rather than crashing.
 *
 * @param cluster - An ioredis Cluster instance.
 * @returns The subscriber's internal Redis connection, or `null` if the
 *   subscriber is not active or the internal structure doesn't match.
 */
export function getClusterSubscriberInstance(
  cluster: RedisCluster,
): InternalRedisConnection | null {
  // ioredis Cluster.subscriber is TypeScript-private but public at runtime.
  // We cast through `unknown` to a narrow documented interface — NOT `as any`.
  const internal = cluster as unknown as ClusterWithInternalSubscriber;

  if (internal.subscriber != null && typeof internal.subscriber.getInstance === 'function') {
    return internal.subscriber.getInstance();
  }

  return null;
}

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
 * In **cluster mode**, the cluster-level `options.redisOptions.password` is
 * updated first, then each node returned by `nodes('all')` gets its per-node
 * password set and an `AUTH` issued. Individual node `AUTH` failures are
 * collected and logged as warnings but do not abort the loop, all remaining
 * nodes are still attempted. If any nodes failed, the function throws an
 * aggregate error summarising how many nodes failed. Also refreshes the ClusterSubscriber 
 * password as it isn't reachable with `nodes('all')` and must be updated separately.
 *
 * In **standalone mode**, `options.password` is updated first, then a single
 * `AUTH` command is issued.
 *
 * @param redis - The active ioredis client (standalone or cluster).
 * @param token - The fresh SigV4 IAM auth token.
 * @param username - The ElastiCache IAM username.
 * @param logger - Logger with `debug` and `warn` methods.
 * @throws When one or more cluster nodes fail `AUTH`, or when standalone `AUTH` fails.
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

    const errors: Array<{ node: string; error: unknown }> = [];
    for (const node of nodes) {
      node.options.password = token;
      try {
        await node.call('AUTH', username, token);
      } catch (err) {
        errors.push({ node: node.options.host ?? 'unknown', error: err });
        logger.warn('Failed to re-AUTH cluster node (service=elasticache, error=%s)', err);
      }
    }
    // Update cluster-level redisOptions for new node connections.
    if (redis.options?.redisOptions) {
      redis.options.redisOptions.password = token;
    }
    const subscriberInstance = getClusterSubscriberInstance(redis);
    if (subscriberInstance) {
      subscriberInstance.options.password = token;
      logger.debug('Updated ClusterSubscriber internal connection password (service=elasticache)');
    }
    if (errors.length > 0) {
      throw new Error(`Failed to re-AUTH ${errors.length}/${nodes.length} cluster node(s)`);
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
