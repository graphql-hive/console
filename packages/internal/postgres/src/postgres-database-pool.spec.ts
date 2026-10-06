import { describe, expect, it, vi } from 'vitest';
import { createConnectionStringProvider } from './connection-string';

// Mock slonik createPool so we can inspect what it receives
const mockCreatePool = vi.fn().mockResolvedValue({
  one: vi.fn(),
  many: vi.fn(),
  any: vi.fn(),
  exists: vi.fn(),
  maybeOne: vi.fn(),
  oneFirst: vi.fn(),
  maybeOneFirst: vi.fn(),
  anyFirst: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
  end: vi.fn(),
});

vi.mock('slonik', async importOriginal => {
  const actual = await importOriginal<typeof import('slonik')>();
  return {
    ...actual,
    createPool: (...args: any[]) => mockCreatePool(...args),
  };
});

vi.mock('@hive/service-common', () => ({
  context: { active: vi.fn(), with: vi.fn((_ctx: any, fn: any) => fn()) },
  SpanKind: { INTERNAL: 0 },
  SpanStatusCode: { ERROR: 2 },
  withErrorSource: (promise: Promise<unknown>) => promise,
  trace: {
    getTracer: () => ({
      startSpan: () => ({
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
      }),
    }),
    setSpan: vi.fn(),
  },
}));

vi.mock('slonik-interceptor-query-logging', () => ({
  createQueryLoggingInterceptor: () => ({}),
}));

describe('createPostgresDatabasePool', () => {
  describe('connection parameter types', () => {
    it('builds a connection string from PostgresConnectionParamaters', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await createPostgresDatabasePool({
        connectionParameters: {
          host: 'localhost',
          port: 5432,
          password: 'pass',
          user: 'user',
          db: 'hive',
          ssl: false,
        },
      });

      expect(mockCreatePool).toHaveBeenCalledWith(
        'postgres://user:pass@localhost:5432/hive?sslmode=disable',
        expect.objectContaining({
          captureStackTrace: false,
        }),
      );
    });

    it('passes a string connection directly', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@myhost:5432/db?sslmode=require',
      });

      expect(mockCreatePool).toHaveBeenCalledWith(
        'postgres://user:pass@myhost:5432/db?sslmode=require',
        expect.any(Object),
      );
    });

    it('resolves a ConnectionStringProvider for the pool and again for every connection password', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      let calls = 0;
      const provider = async () =>
        `postgres://iamuser:${encodeURIComponent(`token/${++calls}`)}@aurora:5432/db?sslmode=require`;

      await createPostgresDatabasePool({ connectionParameters: provider });

      const [connectionString, options] = mockCreatePool.mock.calls.at(-1)!;
      expect(connectionString).toBe('postgres://iamuser:token%2F1@aurora:5432/db?sslmode=require');
      // Slonik calls this for each new connection; every call must fetch a fresh token.
      await expect(options.password()).resolves.toBe('token/2');
      await expect(options.password()).resolves.toBe('token/3');
    });

    it('hands slonik the raw token even when createConnectionString percent-encoded it', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      const token = 'p@ss:w/rd%20+&=';
      const provider = createConnectionStringProvider(
        { host: 'aurora', port: 5432, user: 'iam', db: 'db', ssl: true, password: undefined },
        async () => token,
      );

      await createPostgresDatabasePool({ connectionParameters: provider });

      const [, options] = mockCreatePool.mock.calls.at(-1)!;
      await expect(options.password()).resolves.toBe(token);
    });

    it('passes no password callback for a static connection string', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@myhost:5432/db?sslmode=require',
      });

      const [, options] = mockCreatePool.mock.calls.at(-1)!;
      expect(options).not.toHaveProperty('password');
    });
  });

  describe('pool options', () => {
    it('applies maximumPoolSize option', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@host:5432/db?sslmode=disable',
        maximumPoolSize: 20,
      });

      expect(mockCreatePool).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ maximumPoolSize: 20 }),
      );
    });

    it('applies statementTimeout option', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@host:5432/db?sslmode=disable',
        statementTimeout: 30000,
      });

      expect(mockCreatePool).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ statementTimeout: 30000 }),
      );
    });

    it('sets idleTimeout to 30000', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@host:5432/db?sslmode=disable',
      });

      expect(mockCreatePool).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ idleTimeout: 30000 }),
      );
    });
    it('disables slonik tracing', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@host:5432/db?sslmode=disable',
      });

      expect(mockCreatePool).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ tracing: false }),
      );
    });
  });

  describe('transaction', () => {
    it('keeps the slonik connection as `this` for every method handed to the handler', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      // Mirrors slonik >= 48.14, where the connection is a class instance whose methods use `this`.
      class SlonikTransactionConnection {
        private assertBound() {
          if (!(this instanceof SlonikTransactionConnection)) {
            throw new TypeError('connection method called unbound');
          }
        }
        exists() {
          this.assertBound();
          return Promise.resolve(true);
        }
        any() {
          this.assertBound();
          return Promise.resolve([]);
        }
        maybeOne() {
          this.assertBound();
          return Promise.resolve(null);
        }
        query() {
          this.assertBound();
          return Promise.resolve({});
        }
        oneFirst() {
          this.assertBound();
          return Promise.resolve(1);
        }
        maybeOneFirst() {
          this.assertBound();
          return Promise.resolve(null);
        }
        anyFirst() {
          this.assertBound();
          return Promise.resolve([]);
        }
        one() {
          this.assertBound();
          return Promise.resolve({});
        }
      }
      mockCreatePool.mockResolvedValueOnce({
        transaction: (handler: (connection: SlonikTransactionConnection) => unknown) =>
          handler(new SlonikTransactionConnection()),
      });

      const pool = await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@host:5432/db?sslmode=disable',
      });
      const sql = {} as any;

      await expect(
        pool.transaction('spec', async methods => {
          await methods.exists(sql);
          await methods.any(sql);
          await methods.maybeOne(sql);
          await methods.query(sql);
          await methods.oneFirst(sql);
          await methods.maybeOneFirst(sql);
          await methods.anyFirst(sql);
          await methods.one(sql);
          // The virtual nested transaction hands out the same wrapped methods.
          return methods.transaction('nested', nested => nested.oneFirst(sql));
        }),
      ).resolves.toBe(1);
    });
  });

  describe('returned pool', () => {
    it('returns a PostgresDatabasePool with end() method', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      const pool = await createPostgresDatabasePool({
        connectionParameters: 'postgres://user:pass@host:5432/db?sslmode=disable',
      });

      expect(pool).toBeDefined();
      expect(typeof pool.end).toBe('function');
    });
  });

  describe('error handling', () => {
    it('propagates errors when createPool rejects', async () => {
      mockCreatePool.mockRejectedValueOnce(new Error('Connection refused'));

      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      await expect(
        createPostgresDatabasePool({
          connectionParameters: 'postgres://user:pass@unreachable:5432/db?sslmode=disable',
        }),
      ).rejects.toThrow('Connection refused');
    });
  });
});
