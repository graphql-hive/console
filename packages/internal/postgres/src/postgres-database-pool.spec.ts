import { describe, expect, it, vi } from 'vitest';

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

    it('passes a ConnectionStringProvider function directly to createPool', async () => {
      const { createPostgresDatabasePool } = await import('./postgres-database-pool');

      const provider = async () => 'postgres://iamuser:token@aurora:5432/db?sslmode=require';

      await createPostgresDatabasePool({
        connectionParameters: provider,
      });

      // When provider is a function, it should be passed as-is (the patched createPool handles it)
      const firstArg = mockCreatePool.mock.calls[mockCreatePool.mock.calls.length - 1][0];
      expect(typeof firstArg).toBe('function');
      expect(await firstArg()).toBe('postgres://iamuser:token@aurora:5432/db?sslmode=require');
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
