import { describe, expect, it, vi } from 'vitest';
import { createConnectionString, createConnectionStringProvider } from './connection-string';

describe('createConnectionString', () => {
  it('builds a connection string with password and ssl enabled', () => {
    const result = createConnectionString({
      host: 'aurora-cluster.us-east-1.rds.amazonaws.com',
      port: 5432,
      password: 'secret123',
      user: 'dbuser',
      db: 'registry',
      ssl: true,
    });

    expect(result).toBe(
      'postgres://dbuser:secret123@aurora-cluster.us-east-1.rds.amazonaws.com:5432/registry?sslmode=require',
    );
  });

  it('builds a connection string without password when undefined', () => {
    const result = createConnectionString({
      host: 'localhost',
      port: 5432,
      password: undefined,
      user: 'postgres',
      db: 'hive',
      ssl: false,
    });

    expect(result).toBe('postgres://postgres@localhost:5432/hive?sslmode=disable');
  });

  it('includes an empty password segment when password is an empty string', () => {
    const result = createConnectionString({
      host: 'localhost',
      port: 5432,
      password: '',
      user: 'postgres',
      db: 'hive',
      ssl: false,
    });

    expect(result).toBe('postgres://postgres:@localhost:5432/hive?sslmode=disable');
  });

  it('encodes special characters in user and password', () => {
    const result = createConnectionString({
      host: 'db.example.com',
      port: 5432,
      password: 'p@ss:word/with?special&chars=',
      user: 'user@domain',
      db: 'mydb',
      ssl: true,
    });

    expect(result).toContain('user%40domain');
    expect(result).toContain(encodeURIComponent('p@ss:word/with?special&chars='));
    expect(result).toContain('?sslmode=require');
  });

  it('encodes special characters in host and db', () => {
    const result = createConnectionString({
      host: 'host with spaces',
      port: 5432,
      password: 'pass',
      user: 'user',
      db: 'db/name',
      ssl: false,
    });

    expect(result).toContain('host%20with%20spaces');
    expect(result).toContain('db%2Fname');
  });

  it('uses sslmode=disable when ssl is false', () => {
    const result = createConnectionString({
      host: 'localhost',
      port: 5432,
      password: 'pass',
      user: 'user',
      db: 'db',
      ssl: false,
    });

    expect(result).toContain('?sslmode=disable');
  });
});

describe('createConnectionStringProvider', () => {
  describe('static mode (no tokenGenerator)', () => {
    it('returns a static connection string', async () => {
      const provider = createConnectionStringProvider({
        host: 'localhost',
        port: 5432,
        password: 'static-pass',
        user: 'user',
        db: 'hive',
        ssl: false,
      });

      const first = await provider();
      const second = await provider();

      expect(first).toBe(second);
      expect(first).toBe('postgres://user:static-pass@localhost:5432/hive?sslmode=disable');
    });
  });

  describe('dynamic mode (with tokenGenerator)', () => {
    it('calls tokenGenerator on each invocation', async () => {
      let callCount = 0;
      const tokenGenerator = vi.fn(async () => {
        callCount++;
        return `token-${callCount}`;
      });

      const provider = createConnectionStringProvider(
        {
          host: 'aurora.rds.amazonaws.com',
          port: 5432,
          password: undefined,
          user: 'iamuser',
          db: 'registry',
          ssl: true,
        },
        tokenGenerator,
      );

      const first = await provider();
      const second = await provider();

      expect(tokenGenerator).toHaveBeenCalledTimes(2);
      expect(first).toContain('token-1');
      expect(second).toContain('token-2');
      expect(first).not.toBe(second);
    });

    it('uses token as password in the connection string', async () => {
      const tokenGenerator = vi.fn(async () => 'iam-signed-token-xyz');

      const provider = createConnectionStringProvider(
        {
          host: 'my-cluster.rds.amazonaws.com',
          port: 5432,
          password: undefined,
          user: 'appuser',
          db: 'mydb',
          ssl: true,
        },
        tokenGenerator,
      );

      const result = await provider();

      expect(result).toBe(
        `postgres://appuser:${encodeURIComponent('iam-signed-token-xyz')}@my-cluster.rds.amazonaws.com:5432/mydb?sslmode=require`,
      );
    });

    it('encodes tokens with special characters', async () => {
      const specialToken = 'token/with+special=chars&more';
      const tokenGenerator = vi.fn(async () => specialToken);

      const provider = createConnectionStringProvider(
        {
          host: 'host',
          port: 5432,
          password: undefined,
          user: 'user',
          db: 'db',
          ssl: true,
        },
        tokenGenerator,
      );

      const result = await provider();

      expect(result).toContain(encodeURIComponent(specialToken));
    });

    it('overrides config.password with token from generator', async () => {
      const tokenGenerator = vi.fn(async () => 'fresh-token');

      const provider = createConnectionStringProvider(
        {
          host: 'host',
          port: 5432,
          password: 'old-static-password',
          user: 'user',
          db: 'db',
          ssl: true,
        },
        tokenGenerator,
      );

      const result = await provider();

      expect(result).toContain(':fresh-token@');
      expect(result).not.toContain('old-static-password');
    });
  });

  describe('tokenGenerator errors', () => {
    it('propagates errors thrown by tokenGenerator', async () => {
      const tokenGenerator = vi.fn(async () => {
        throw new Error('IAM credentials expired');
      });

      const provider = createConnectionStringProvider(
        {
          host: 'host',
          port: 5432,
          password: undefined,
          user: 'user',
          db: 'db',
          ssl: true,
        },
        tokenGenerator,
      );

      await expect(provider()).rejects.toThrow('IAM credentials expired');
    });

    it('propagates rejected promises from tokenGenerator', async () => {
      const tokenGenerator = vi.fn(() => Promise.reject(new Error('Network timeout')));

      const provider = createConnectionStringProvider(
        {
          host: 'host',
          port: 5432,
          password: undefined,
          user: 'user',
          db: 'db',
          ssl: true,
        },
        tokenGenerator,
      );

      await expect(provider()).rejects.toThrow('Network timeout');
    });

    it('builds a valid connection string when tokenGenerator returns an empty string', async () => {
      const tokenGenerator = vi.fn(async () => '');

      const provider = createConnectionStringProvider(
        {
          host: 'host',
          port: 5432,
          password: undefined,
          user: 'user',
          db: 'db',
          ssl: true,
        },
        tokenGenerator,
      );

      const result = await provider();

      expect(result).toBe('postgres://user:@host:5432/db?sslmode=require');
    });
  });
});
