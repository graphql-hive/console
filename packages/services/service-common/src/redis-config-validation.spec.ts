import { describe, expect, it } from 'vitest';
import zod from 'zod';
import { parseRedisConfigFromEnvironment } from './redis-config-validation';

describe('parseRedisConfigFromEnvironment', () => {
  const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

  const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
    if (typeof input == 'number') return input;
    if (isNumberString(input)) return Number(input);
  };

  const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

  // treat an empty string (`''`) as undefined
  const emptyString = <T extends zod.ZodType>(input: T) => {
    return zod.preprocess((value: unknown) => {
      if (value === '') return undefined;
      return value;
    }, input);
  };

  const schema = zod.object({
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

  function parseRedis(raw: Record<string, unknown>) {
    const parsed = schema.safeParse(raw);
    expect(parsed.success).toBe(true);
    return parsed.success ? parsed.data : undefined;
  }

  it('returns ok for static auth config', () => {
    const redis = parseRedis({
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'secret',
      REDIS_AWS_IAM_AUTH_ENABLED: '0',
    });

    const result = parseRedisConfigFromEnvironment({ redis: redis!, awsRegion: undefined });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config).toMatchObject({
        host: 'localhost',
        port: 6379,
        password: 'secret',
        awsIamAuthEnabled: false,
      });
    }
  });

  it('returns ok for valid iam config', () => {
    const redis = parseRedis({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '1',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
      REDIS_AWS_REGION: 'us-east-1',
    });

    const result = parseRedisConfigFromEnvironment({ redis: redis!, awsRegion: undefined });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config).toMatchObject({
        awsIamAuthEnabled: true,
        tlsEnabled: true,
        awsRegion: 'us-east-1',
        awsIamAuthCacheName: 'my-cache',
      });
    }
  });

  it('returns error when iam enabled and tls disabled', () => {
    const redis = parseRedis({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '0',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
      REDIS_AWS_REGION: 'us-east-1',
    });

    const result = parseRedisConfigFromEnvironment({ redis: redis!, awsRegion: undefined });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain(
        'REDIS_TLS_ENABLED must be enabled (ElastiCache IAM requires TLS)',
      );
    }
  });

  it('returns error when iam enabled and cache name missing', () => {
    const redis = parseRedis({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '1',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_REGION: 'us-east-1',
    });

    const result = parseRedisConfigFromEnvironment({ redis: redis!, awsRegion: undefined });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain('REDIS_AWS_IAM_CACHE_NAME');
    }
  });

  it('returns error when iam enabled and both regions missing', () => {
    const redis = parseRedis({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '1',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
    });

    const result = parseRedisConfigFromEnvironment({ redis: redis!, awsRegion: undefined });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain('REDIS_AWS_REGION or AWS_REGION');
    }
  });

  it('uses AWS_REGION fallback when REDIS_AWS_REGION is missing', () => {
    const redis = parseRedis({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '1',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
    });

    const result = parseRedisConfigFromEnvironment({ redis: redis!, awsRegion: 'eu-west-1' });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.awsRegion).toBe('eu-west-1');
    }
  });

  it('normalizes empty optional fields', () => {
    const redis = parseRedis({
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: '',
      REDIS_USERNAME: '',
      REDIS_AWS_IAM_AUTH_ENABLED: '0',
    });

    const result = parseRedisConfigFromEnvironment({ redis: redis!, awsRegion: undefined });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.password).toBe('');
      expect(result.config.username).toBeUndefined();
    }
  });
});
