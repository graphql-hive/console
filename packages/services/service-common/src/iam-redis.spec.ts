import { Cluster as RedisCluster } from 'ioredis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(function (this: any) {
      return this;
    }),
    level: 'info',
    silent: vi.fn(),
  };
}

const mockGeneratePresignedToken = vi.fn();

// Mock node:timers/promises so sleep uses the faked global setTimeout
vi.mock('node:timers/promises', () => ({
  setTimeout: (ms: number, _value?: unknown, options?: { signal?: AbortSignal }) =>
    new Promise<void>((resolve, reject) => {
      const id = globalThis.setTimeout(resolve, ms);
      options?.signal?.addEventListener('abort', () => {
        globalThis.clearTimeout(id);
        reject(new DOMException('The operation was aborted', 'AbortError'));
      });
    }),
}));

vi.mock('./iam-aws', async importOriginal => {
  const actual = await importOriginal<typeof import('./iam-aws')>();
  return {
    ...actual,
    generatePresignedToken: (...args: any[]) => mockGeneratePresignedToken(...args),
  };
});

beforeEach(() => {
  mockGeneratePresignedToken.mockReset();
});

describe('generateIamAuthToken', () => {
  describe('ElastiCache SigV4 params', () => {
    it('delegates to generatePresignedToken with service=elasticache', async () => {
      mockGeneratePresignedToken.mockResolvedValue('signed-token-123');

      const { generateIamAuthToken } = await import('./iam-redis');
      const logger = createMockLogger();

      const token = await generateIamAuthToken(
        {
          host: 'my-cluster.abc.cache.amazonaws.com',
          port: 6190,
          awsRegion: 'us-east-1',
          username: 'default',
          iamAuthCacheName: 'my-repl-group',
        },
        logger,
      );

      expect(token).toBe('signed-token-123');
      expect(mockGeneratePresignedToken).toHaveBeenCalledWith({
        service: 'elasticache',
        region: 'us-east-1',
        hostname: 'my-repl-group',
        query: { Action: 'connect', User: 'default' },
      });
    });

    it('passes the configured username in the query User param', async () => {
      mockGeneratePresignedToken.mockResolvedValue('token');

      const { generateIamAuthToken } = await import('./iam-redis');
      const logger = createMockLogger();

      await generateIamAuthToken(
        {
          host: 'host',
          port: 6379,
          awsRegion: 'eu-west-1',
          username: 'readwrite-user',
          iamAuthCacheName: 'cache-group',
        },
        logger,
      );

      expect(mockGeneratePresignedToken).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { Action: 'connect', User: 'readwrite-user' },
        }),
      );
    });

    it('falls back to a placeholder hostname when iamAuthCacheName is empty', async () => {
      mockGeneratePresignedToken.mockResolvedValue('token');

      const { generateIamAuthToken } = await import('./iam-redis');
      const logger = createMockLogger();

      await generateIamAuthToken(
        {
          host: 'host',
          port: 6379,
          awsRegion: 'us-east-1',
          username: 'myuser',
          iamAuthCacheName: '',
        },
        logger,
      );

      expect(mockGeneratePresignedToken).toHaveBeenCalledWith(
        expect.objectContaining({ hostname: 'i-cannot-be-empty' }),
      );
    });
  });

  describe('error propagation', () => {
    it('rejects when the underlying presign call fails', async () => {
      mockGeneratePresignedToken.mockRejectedValue(new Error('STS timeout'));

      const { generateIamAuthToken } = await import('./iam-redis');
      const logger = createMockLogger();

      await expect(
        generateIamAuthToken(
          {
            host: 'host',
            port: 6379,
            awsRegion: 'us-east-1',
            username: 'default',
            iamAuthCacheName: 'cache',
          },
          logger,
        ),
      ).rejects.toThrow('STS timeout');
    });
  });
});

describe('refreshIamAuth', () => {
  describe('standalone mode', () => {
    it('calls AUTH and updates options.password', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockRedis = {
        call: vi.fn().mockResolvedValue('OK'),
        options: { password: 'old-token' },
      } as any;

      await refreshIamAuth(mockRedis, 'new-token-xyz', 'default', logger);

      expect(mockRedis.call).toHaveBeenCalledWith('AUTH', 'default', 'new-token-xyz');
      expect(mockRedis.options.password).toBe('new-token-xyz');
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('IAM token refreshed successfully'),
      );
    });

    it('rejects when AUTH fails on standalone Redis', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockRedis = {
        call: vi.fn().mockRejectedValue(new Error('WRONGPASS')),
        options: { password: 'old-token' },
      } as any;

      await expect(refreshIamAuth(mockRedis, 'bad-token', 'default', logger)).rejects.toThrow(
        'WRONGPASS',
      );

      // Password IS updated before AUTH so ioredis uses the fresh token on reconnect
      expect(mockRedis.options.password).toBe('bad-token');
    });

    it('updates password before AUTH so reconnects use fresh token', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const callOrder: string[] = [];
      const mockRedis = {
        call: vi.fn().mockImplementation(() => {
          callOrder.push('AUTH');
          return Promise.resolve('OK');
        }),
        options: {
          set password(val: string) {
            callOrder.push('password');
            this._password = val;
          },
          get password() {
            return this._password;
          },
          _password: 'old-token',
        },
      } as any;

      await refreshIamAuth(mockRedis, 'new-token', 'default', logger);

      expect(callOrder).toEqual(['password', 'AUTH']);
      expect(mockRedis.options.password).toBe('new-token');
    });
  });

  describe('cluster mode', () => {
    it('iterates all cluster nodes and re-AUTHs each one', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const node1 = { call: vi.fn().mockResolvedValue('OK'), options: { password: 'old' } };
      const node2 = { call: vi.fn().mockResolvedValue('OK'), options: { password: 'old' } };
      const node3 = { call: vi.fn().mockResolvedValue('OK'), options: { password: 'old' } };

      const mockCluster = Object.assign(Object.create(RedisCluster.prototype), {
        nodes: vi.fn().mockReturnValue([node1, node2, node3]),
        options: { redisOptions: { password: 'old' } },
      });

      await refreshIamAuth(mockCluster, 'new-cluster-token', 'myuser', logger);

      for (const node of [node1, node2, node3]) {
        expect(node.call).toHaveBeenCalledWith('AUTH', 'myuser', 'new-cluster-token');
        expect(node.options.password).toBe('new-cluster-token');
      }
      expect(mockCluster.options.redisOptions.password).toBe('new-cluster-token');
    });

    it('updates options.redisOptions so new node connections use the fresh token', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockCluster = Object.assign(Object.create(RedisCluster.prototype), {
        nodes: vi.fn().mockReturnValue([]),
        options: { redisOptions: { password: 'old-password' } },
      });

      await refreshIamAuth(mockCluster, 'refreshed-token', 'user', logger);

      expect(mockCluster.options.redisOptions.password).toBe('refreshed-token');
    });

    it('continues re-AUTHing remaining nodes when one node fails, then throws', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const healthyNode = {
        call: vi.fn().mockResolvedValue('OK'),
        options: { host: 'node-1', password: 'old' },
      };
      const failingNode = {
        call: vi.fn().mockRejectedValue(new Error('NOAUTH')),
        options: { host: 'node-2', password: 'old' },
      };

      const mockCluster = Object.assign(Object.create(RedisCluster.prototype), {
        nodes: vi.fn().mockReturnValue([healthyNode, failingNode]),
        options: { redisOptions: { password: 'old' } },
      });

      // Should throw after attempting all nodes
      await expect(refreshIamAuth(mockCluster, 'token', 'default', logger)).rejects.toThrow(
        'Failed to re-AUTH 1/2 cluster node(s)',
      );

      // Both nodes get password updated before AUTH (so reconnects use fresh token)
      expect(healthyNode.options.password).toBe('token');
      expect(failingNode.options.password).toBe('token');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to re-AUTH cluster node'),
        expect.any(Error),
      );
    });

    it('updates node passwords before AUTH so reconnects use fresh token', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const callOrder: string[] = [];
      const createNode = (name: string) => ({
        call: vi.fn().mockImplementation(() => {
          callOrder.push(`${name}:AUTH`);
          return Promise.resolve('OK');
        }),
        options: {
          set password(val: string) {
            callOrder.push(`${name}:password`);
            this._password = val;
          },
          get password() {
            return this._password;
          },
          _password: 'old',
        },
      });

      const node1 = createNode('node1');
      const node2 = createNode('node2');

      const mockCluster = Object.assign(Object.create(RedisCluster.prototype), {
        nodes: vi.fn().mockReturnValue([node1, node2]),
        options: { redisOptions: { password: 'old' } },
      });

      await refreshIamAuth(mockCluster, 'new-token', 'user', logger);

      // Each node's password is set before its AUTH call
      expect(callOrder).toEqual(['node1:password', 'node1:AUTH', 'node2:password', 'node2:AUTH']);
      expect(node1.options.password).toBe('new-token');
      expect(node2.options.password).toBe('new-token');
    });

    it('throws when all cluster nodes fail', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const node1 = {
        call: vi.fn().mockRejectedValue(new Error('NOAUTH')),
        options: { host: 'node-1', password: 'old' },
      };
      const node2 = {
        call: vi.fn().mockRejectedValue(new Error('NOAUTH')),
        options: { host: 'node-2', password: 'old' },
      };

      const mockCluster = Object.assign(Object.create(RedisCluster.prototype), {
        nodes: vi.fn().mockReturnValue([node1, node2]),
        options: { redisOptions: { password: 'old' } },
      });

      await expect(refreshIamAuth(mockCluster, 'token', 'default', logger)).rejects.toThrow(
        'Failed to re-AUTH 2/2 cluster node(s)',
      );

      // Both nodes get password updated before AUTH (so reconnects use fresh token)
      expect(node1.options.password).toBe('token');
      expect(node2.options.password).toBe('token');
    });

    it('handles missing options.redisOptions gracefully', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockCluster = Object.assign(Object.create(RedisCluster.prototype), {
        nodes: vi.fn().mockReturnValue([]),
        options: undefined,
      });

      await expect(refreshIamAuth(mockCluster, 'token', 'user', logger)).resolves.toBeUndefined();
    });

    it('handles empty nodes list gracefully', async () => {
      const { refreshIamAuth } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockCluster = Object.assign(Object.create(RedisCluster.prototype), {
        nodes: vi.fn().mockReturnValue([]),
        options: { redisOptions: { password: 'old' } },
      });

      await expect(refreshIamAuth(mockCluster, 'token', 'user', logger)).resolves.toBeUndefined();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('re-authenticating %s cluster node(s)'),
        0,
      );
    });
  });
});

describe('startIamTokenRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('refresh lifecycle', () => {
    it('generates a token and re-AUTHs Redis on each tick', async () => {
      mockGeneratePresignedToken.mockResolvedValue('refreshed-token');

      const { startIamTokenRefresh } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockRedis = {
        call: vi.fn().mockResolvedValue('OK'),
        options: { password: 'initial-token' },
      } as any;

      const config = {
        host: 'host',
        port: 6190,
        awsRegion: 'us-east-1',
        username: 'default',
        iamAuthCacheName: 'cache-name',
      };

      const timer = startIamTokenRefresh(mockRedis, config, logger);

      // ElastiCache interval: (900 - 180) * 1000 = 720_000ms
      await vi.advanceTimersByTimeAsync(720_000);

      expect(mockGeneratePresignedToken).toHaveBeenCalled();
      expect(mockRedis.call).toHaveBeenCalledWith('AUTH', 'default', 'refreshed-token');
      expect(mockRedis.options.password).toBe('refreshed-token');

      timer();
    });

    it('returns a clearable interval handle', async () => {
      const { startIamTokenRefresh } = await import('./iam-redis');
      const logger = createMockLogger();
      const mockRedis = { call: vi.fn(), options: {} } as any;

      const timer = startIamTokenRefresh(
        mockRedis,
        { host: 'h', port: 1, awsRegion: 'r', username: 'u', iamAuthCacheName: 'c' },
        logger,
      );

      timer();

      await vi.advanceTimersByTimeAsync(720_000);
      expect(mockRedis.call).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('logs errors when token generation fails', async () => {
      mockGeneratePresignedToken.mockRejectedValue(new Error('STS unreachable'));

      const { startIamTokenRefresh } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockRedis = {
        call: vi.fn(),
        options: { password: 'old' },
      } as any;

      const timer = startIamTokenRefresh(
        mockRedis,
        { host: 'h', port: 1, awsRegion: 'r', username: 'u', iamAuthCacheName: 'c' },
        logger,
      );

      await vi.advanceTimersByTimeAsync(720_000);
      // Allow retries to fire (attempt 1: 5s, attempt 2: 10s)
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ElastiCache IAM token refresh failed'),
        expect.anything(),
        expect.anything(),
        expect.any(Error),
      );
      // Redis password should NOT change
      expect(mockRedis.options.password).toBe('old');

      timer();
    });

    it('logs exhaustion message after all retries fail', async () => {
      mockGeneratePresignedToken.mockRejectedValue(new Error('credentials expired'));

      const { startIamTokenRefresh } = await import('./iam-redis');
      const logger = createMockLogger();

      const mockRedis = {
        call: vi.fn(),
        options: { password: 'old' },
      } as any;

      const timer = startIamTokenRefresh(
        mockRedis,
        { host: 'h', port: 1, awsRegion: 'r', username: 'u', iamAuthCacheName: 'c' },
        logger,
      );

      await vi.advanceTimersByTimeAsync(720_000);
      // Advance retry backoff timers individually (attempt 1: 5s, attempt 2: 10s)
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('exhausted all retries'));

      timer();
    });
  });
});

describe('resolveRedisCredentials', () => {
  describe('static password (no IAM)', () => {
    it('returns the static password when iamConfig is not provided', async () => {
      const { resolveRedisCredentials } = await import('./iam-redis');
      const logger = createMockLogger();

      const result = await resolveRedisCredentials('my-static-password', logger);

      expect(result).toEqual({ password: 'my-static-password' });
      expect(mockGeneratePresignedToken).not.toHaveBeenCalled();
    });

    it('returns the static password when iamConfig is undefined', async () => {
      const { resolveRedisCredentials } = await import('./iam-redis');
      const logger = createMockLogger();

      const result = await resolveRedisCredentials('pw', logger, undefined);

      expect(result).toEqual({ password: 'pw' });
    });
  });

  describe('IAM token generation', () => {
    it('generates a token and returns it with the IAM username', async () => {
      mockGeneratePresignedToken.mockResolvedValue('iam-generated-token');

      const { resolveRedisCredentials } = await import('./iam-redis');
      const logger = createMockLogger();

      const result = await resolveRedisCredentials('', logger, {
        host: 'my-host',
        port: 6190,
        awsRegion: 'us-east-1',
        username: 'readwrite-user',
        iamAuthCacheName: 'my-cache-group',
      });

      expect(result).toEqual({ password: 'iam-generated-token', username: 'readwrite-user' });
      expect(mockGeneratePresignedToken).toHaveBeenCalled();
    });

    it('rejects when token generation fails', async () => {
      mockGeneratePresignedToken.mockRejectedValue(new Error('no credentials'));

      const { resolveRedisCredentials } = await import('./iam-redis');
      const logger = createMockLogger();

      await expect(
        resolveRedisCredentials('', logger, {
          host: 'my-host',
          port: 6190,
          awsRegion: 'us-east-1',
          username: 'user',
          iamAuthCacheName: 'cache',
        }),
      ).rejects.toThrow('no credentials');
    });
  });
});
