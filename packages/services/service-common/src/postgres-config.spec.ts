import { describe, expect, it } from 'vitest';
import { parsePostgresConfigFromEnvironment } from './postgres-config';

describe('parsePostgresConfigFromEnvironment', () => {
  it('returns ok for static auth config', () => {
    const result = parsePostgresConfigFromEnvironment({
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'hive',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_AWS_IAM_AUTH_ENABLED: '0',
    });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config).toMatchObject({
        host: 'localhost',
        port: 5432,
        db: 'hive',
        user: 'postgres',
        password: 'secret',
        ssl: false,
        awsIamAuthEnabled: false,
      });
    }
  });

  it('returns ok for valid iam config', () => {
    const result = parsePostgresConfigFromEnvironment({
      POSTGRES_HOST: 'db.aws',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'hive',
      POSTGRES_USER: 'iam-user',
      POSTGRES_SSL: '1',
      POSTGRES_AWS_IAM_AUTH_ENABLED: '1',
      POSTGRES_AWS_REGION: 'us-east-1',
    });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config).toMatchObject({
        awsIamAuthEnabled: true,
        ssl: true,
        awsRegion: 'us-east-1',
      });
    }
  });

  it('returns error when iam enabled and ssl disabled', () => {
    const result = parsePostgresConfigFromEnvironment({
      POSTGRES_HOST: 'db.aws',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'hive',
      POSTGRES_USER: 'iam-user',
      POSTGRES_SSL: '0',
      POSTGRES_AWS_IAM_AUTH_ENABLED: '1',
      POSTGRES_AWS_REGION: 'us-east-1',
    });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain('POSTGRES_SSL must be enabled (RDS IAM requires TLS)');
    }
  });

  it('returns error when iam enabled and both regions missing', () => {
    const result = parsePostgresConfigFromEnvironment({
      POSTGRES_HOST: 'db.aws',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'hive',
      POSTGRES_USER: 'iam-user',
      POSTGRES_SSL: '1',
      POSTGRES_AWS_IAM_AUTH_ENABLED: '1',
    });

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.errors[0]).toContain('POSTGRES_AWS_REGION or AWS_REGION');
    }
  });

  it('uses AWS_REGION fallback when POSTGRES_AWS_REGION is missing', () => {
    const result = parsePostgresConfigFromEnvironment(
      {
        POSTGRES_HOST: 'db.aws',
        POSTGRES_PORT: '5432',
        POSTGRES_DB: 'hive',
        POSTGRES_USER: 'iam-user',
        POSTGRES_SSL: '1',
        POSTGRES_AWS_IAM_AUTH_ENABLED: '1',
      },
      'eu-west-1',
    );

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.awsRegion).toBe('eu-west-1');
    }
  });

  it('prefers POSTGRES_AWS_REGION over AWS_REGION fallback', () => {
    const result = parsePostgresConfigFromEnvironment(
      {
        POSTGRES_HOST: 'db.aws',
        POSTGRES_PORT: '5432',
        POSTGRES_DB: 'hive',
        POSTGRES_USER: 'iam-user',
        POSTGRES_SSL: '1',
        POSTGRES_AWS_IAM_AUTH_ENABLED: '1',
        POSTGRES_AWS_REGION: 'us-east-1',
      },
      'eu-west-1',
    );

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.awsRegion).toBe('us-east-1');
    }
  });

  it('normalizes empty optional fields', () => {
    const result = parsePostgresConfigFromEnvironment({
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'hive',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: '',
      POSTGRES_AWS_REGION: '',
      POSTGRES_AWS_IAM_AUTH_ENABLED: '0',
    });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.config.password).toBeUndefined();
      expect(result.config.awsRegion).toBeUndefined();
      expect(result.config.awsIamAuthEnabled).toBe(false);
    }
  });

  it('returns error when required POSTGRES_HOST is missing', () => {
    const result = parsePostgresConfigFromEnvironment({
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'hive',
      POSTGRES_USER: 'postgres',
    });

    expect(result.type).toBe('error');
  });

  it('returns error when POSTGRES_PORT is not a number', () => {
    const result = parsePostgresConfigFromEnvironment({
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: 'not-a-number',
      POSTGRES_DB: 'hive',
      POSTGRES_USER: 'postgres',
    });

    expect(result.type).toBe('error');
  });
});
