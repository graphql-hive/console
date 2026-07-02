import * as zod from 'zod';

// Shared helper for optional empty strings
const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input == 'number') return input;
  if (isNumberString(input)) return Number(input);
};

const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

const emptyString = <T extends zod.ZodType>(input: T) => {
  return zod.preprocess((value: unknown) => {
    if (value === '') return undefined;
    return value;
  }, input);
};

/**
 * Centralized Zod model for Redis environment variables.
 * Used by all services instead of duplicating the schema.
 */
export const RedisModel = zod.object({
  REDIS_HOST: zod.string(),
  REDIS_PORT: NumberFromString,
  REDIS_PASSWORD: emptyString(zod.string().optional()),
  REDIS_USERNAME: emptyString(zod.string().optional()),
  REDIS_TLS_ENABLED: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  REDIS_CLUSTER_MODE_ENABLED: emptyString(
    zod.union([zod.literal('0'), zod.literal('1')]).optional(),
  ),
  REDIS_AWS_REGION: emptyString(zod.string().optional()),
  REDIS_AWS_IAM_AUTH_ENABLED: emptyString(
    zod.union([zod.literal('0'), zod.literal('1')]).optional(),
  ),
  REDIS_AWS_IAM_CACHE_NAME: emptyString(zod.string().optional()),
});

/**
 * Parsed Redis-related environment variables. Inferred from the Zod schema.
 */
export type RedisEnvironment = zod.infer<typeof RedisModel>;

/**
 * Normalized Redis runtime configuration consumed by service modules.
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
 * `error` is returned only for invalid Redis IAM combinations; schema validation
 * errors from Zod are handled by the caller.
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
 * Parses and validates Redis environment variables from process.env, then validates
 * IAM requirements. Returns a discriminated union of ok (with config) or error (with messages).
 */
export function parseRedisConfigFromEnvironment(
  env: NodeJS.ProcessEnv,
  awsRegion?: string,
): ParseRedisConfigFromEnvironmentResult {
  const parseResult = RedisModel.safeParse(env);

  if (!parseResult.success) {
    return {
      type: 'error',
      errors: [JSON.stringify(parseResult.error.format(), null, 4)],
    };
  }

  const redis = parseResult.data;

  if (redis.REDIS_AWS_IAM_AUTH_ENABLED === '1') {
    const missingRedisIamVars: string[] = [];

    if (redis.REDIS_TLS_ENABLED !== '1') {
      missingRedisIamVars.push('REDIS_TLS_ENABLED must be enabled (ElastiCache IAM requires TLS)');
    }

    if (!redis.REDIS_AWS_IAM_CACHE_NAME) {
      missingRedisIamVars.push('REDIS_AWS_IAM_CACHE_NAME');
    }

    if (!redis.REDIS_AWS_REGION && !awsRegion) {
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
      host: redis.REDIS_HOST,
      port: redis.REDIS_PORT,
      password: redis.REDIS_PASSWORD ?? '',
      username: redis.REDIS_USERNAME,
      tlsEnabled: redis.REDIS_TLS_ENABLED === '1',
      clusterModeEnabled: redis.REDIS_CLUSTER_MODE_ENABLED === '1',
      awsIamAuthEnabled: redis.REDIS_AWS_IAM_AUTH_ENABLED === '1',
      awsRegion: redis.REDIS_AWS_REGION ?? awsRegion,
      awsIamAuthCacheName: redis.REDIS_AWS_IAM_CACHE_NAME,
    },
  };
}
