/**
 * Parsed Redis-related environment variables. Matches the shape of the Zod schema built by services.
 */
export type RedisEnvironment = {
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_USERNAME?: string;
  REDIS_TLS_ENABLED?: '0' | '1';
  REDIS_CLUSTER_MODE_ENABLED?: '0' | '1';
  REDIS_AWS_REGION?: string;
  REDIS_AWS_IAM_AUTH_ENABLED?: '0' | '1';
  REDIS_AWS_IAM_CACHE_NAME?: string;
};

/**
 * Normalized Redis runtime configuration consumed by service env modules.
 */
export type RedisConfig = {
  host: string;
  port: number;
  password: string;
  username: string | undefined;
  tlsEnabled: boolean;
  clusterModeEnabled: boolean;
  awsIamAuthEnabled: boolean;
  awsRegion: string | undefined;
  awsIamAuthCacheName: string | undefined;
};

/**
 * Result of building Redis runtime config from environment input.
 *
 * `error` is returned only for invalid Redis IAM combinations; base schema
 * validation errors are handled separately by each service environment module.
 */
export type ParseRedisConfigFromEnvironmentResult =
  | {
      type: 'error';
      errors: Array<string>;
    }
  | {
      type: 'ok';
      config: RedisConfig;
    };

/**
 * Validates Redis IAM requirements and returns a normalized Redis config object.
 */
export function parseRedisConfigFromEnvironment(args: {
  redis: RedisEnvironment;
  awsRegion: string | undefined;
}): ParseRedisConfigFromEnvironmentResult {
  if (args.redis.REDIS_AWS_IAM_AUTH_ENABLED === '1') {
    const missingRedisIamVars: string[] = [];

    if (args.redis.REDIS_TLS_ENABLED !== '1') {
      missingRedisIamVars.push('REDIS_TLS_ENABLED must be enabled (ElastiCache IAM requires TLS)');
    }

    if (!args.redis.REDIS_AWS_IAM_CACHE_NAME) {
      missingRedisIamVars.push('REDIS_AWS_IAM_CACHE_NAME');
    }

    if (!args.redis.REDIS_AWS_REGION && !args.awsRegion) {
      missingRedisIamVars.push('REDIS_AWS_REGION or AWS_REGION');
    }

    if (missingRedisIamVars.length > 0) {
      return {
        type: 'error',
        errors: [
          `REDIS_AWS_IAM_AUTH_ENABLED is enabled but the following required variables are missing or invalid: ${missingRedisIamVars.join(', ')}`,
        ],
      };
    }
  }

  return {
    type: 'ok',
    config: {
      host: args.redis.REDIS_HOST,
      port: args.redis.REDIS_PORT,
      password: args.redis.REDIS_PASSWORD ?? '',
      username: args.redis.REDIS_USERNAME,
      tlsEnabled: args.redis.REDIS_TLS_ENABLED === '1',
      clusterModeEnabled: args.redis.REDIS_CLUSTER_MODE_ENABLED === '1',
      awsIamAuthEnabled: args.redis.REDIS_AWS_IAM_AUTH_ENABLED === '1',
      awsRegion: args.redis.REDIS_AWS_REGION ?? args.awsRegion,
      awsIamAuthCacheName: args.redis.REDIS_AWS_IAM_CACHE_NAME,
    },
  };
}
