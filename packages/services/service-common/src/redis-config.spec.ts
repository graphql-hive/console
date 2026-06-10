import { describe, expect, it } from 'vitest';
import { parseRedisConfigFromEnvironment } from './redis-config';

describe('parseRedisConfigFromEnvironment', () => {
  it('returns ok for static auth config', () => {
    const result = parseRedisConfigFromEnvironment({
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'secret',
      REDIS_AWS_IAM_AUTH_ENABLED: '0',
    });

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
    const result = parseRedisConfigFromEnvironment({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '1',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
      REDIS_AWS_REGION: 'us-east-1',
    });

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
    const result = parseRedisConfigFromEnvironment({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '0',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
      REDIS_AWS_REGION: 'us-east-1',
    });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain(
        'REDIS_TLS_ENABLED must be enabled (ElastiCache IAM requires TLS)',
      );
    }
  });

  it('returns error when iam enabled and cache name missing', () => {
    const result = parseRedisConfigFromEnvironment({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '1',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_REGION: 'us-east-1',
    });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain('REDIS_AWS_IAM_CACHE_NAME');
    }
  });

  it('returns error when iam enabled and both regions missing', () => {
    const result = parseRedisConfigFromEnvironment({
      REDIS_HOST: 'cache.aws',
      REDIS_PORT: '6379',
      REDIS_TLS_ENABLED: '1',
      REDIS_AWS_IAM_AUTH_ENABLED: '1',
      REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
    });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain('REDIS_AWS_REGION or AWS_REGION');
    }
  });

  it('uses AWS_REGION fallback when REDIS_AWS_REGION is missing', () => {
    const result = parseRedisConfigFromEnvironment(
      {
        REDIS_HOST: 'cache.aws',
        REDIS_PORT: '6379',
        REDIS_TLS_ENABLED: '1',
        REDIS_AWS_IAM_AUTH_ENABLED: '1',
        REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
      },
      'eu-west-1',
    );

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.awsRegion).toBe('eu-west-1');
    }
  });

  it('normalizes empty optional fields', () => {
    const result = parseRedisConfigFromEnvironment({
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: '',
      REDIS_USERNAME: '',
      REDIS_AWS_IAM_AUTH_ENABLED: '0',
    });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.password).toBe('');
      expect(result.config.username).toBeUndefined();
    }
  });

  it('returns error when required REDIS_HOST is missing', () => {
    const result = parseRedisConfigFromEnvironment({
      REDIS_PORT: '6379',
    });

    expect(result.type).toBe('error');
  });

  it('returns error when REDIS_PORT is not a number', () => {
    const result = parseRedisConfigFromEnvironment({
      REDIS_HOST: 'localhost',
      REDIS_PORT: 'not-a-number',
    });

    expect(result.type).toBe('error');
  });

  it('prefers REDIS_AWS_REGION over the awsRegion param', () => {
    const result = parseRedisConfigFromEnvironment(
      {
        REDIS_HOST: 'cache.aws',
        REDIS_PORT: '6379',
        REDIS_TLS_ENABLED: '1',
        REDIS_AWS_IAM_AUTH_ENABLED: '1',
        REDIS_AWS_IAM_CACHE_NAME: 'my-cache',
        REDIS_AWS_REGION: 'us-east-1',
      },
      'eu-west-1',
    );

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.awsRegion).toBe('us-east-1');
    }
  });
});
