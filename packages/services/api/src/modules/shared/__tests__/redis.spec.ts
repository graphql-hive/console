import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisConfig } from '../providers/redis';

// Create a mock logger compatible with the Logger class shape
function createMockLogger(): any {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

// Prevent actual Redis connections during tests
vi.mock('ioredis', async () => {
  const EventEmitter = (await import('node:events')).EventEmitter;

  class MockRedis extends EventEmitter {
    options: any;
    constructor(opts?: any) {
      super();
      this.options = opts ?? {};
    }
    connect() {
      return Promise.resolve();
    }
    disconnect() {}
    quit() {
      return Promise.resolve('OK');
    }
  }

  class MockCluster extends EventEmitter {
    options: any;
    startupNodes: any;
    isCluster = true;
    constructor(startupNodes: any, opts?: any) {
      super();
      this.startupNodes = startupNodes;
      this.options = opts ?? {};
    }
    connect() {
      return Promise.resolve();
    }
    disconnect() {}
    quit() {
      return Promise.resolve('OK');
    }
  }

  (MockRedis as any).Cluster = MockCluster;

  return {
    default: MockRedis,
    __esModule: true,
  };
});

const baseConfig: RedisConfig = {
  host: 'localhost',
  port: 6379,
  password: 'test-password',
  tlsEnabled: false,
};

describe('createRedisClient', () => {
  let createRedisClient: typeof import('../providers/redis').createRedisClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../providers/redis');
    createRedisClient = mod.createRedisClient;
  });

  describe('standalone mode', () => {
    it('creates a standalone Redis instance with correct config', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-standalone', baseConfig, logger);

      expect(redis).toBeDefined();
      expect(redis.options).toMatchObject({
        host: 'localhost',
        port: 6379,
        password: 'test-password',
        db: 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    });

    it('sets TLS options when tlsEnabled is true', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-tls', { ...baseConfig, tlsEnabled: true }, logger);

      expect(redis.options.tls).toEqual({});
    });

    it('does not set TLS when tlsEnabled is false', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-no-tls', baseConfig, logger);

      expect(redis.options.tls).toBeUndefined();
    });

    it('passes username when provided', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-user', { ...baseConfig, username: 'myuser' }, logger);

      expect(redis.options.username).toBe('myuser');
    });

    it('includes retryStrategy that caps at 2000ms', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-retry', baseConfig, logger);

      const strategy = redis.options.retryStrategy;
      expect(strategy).toBeDefined();
      expect(strategy!(1)).toBe(500);
      expect(strategy!(3)).toBe(1500);
      expect(strategy!(5)).toBe(2000);
      expect(strategy!(100)).toBe(2000);
    });

    it('reconnectOnError returns 1', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-reconnect', baseConfig, logger);

      const handler = redis.options.reconnectOnError;
      expect(handler).toBeDefined();
      expect(handler!(new Error('READONLY'))).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('reconnectOnError'),
        expect.any(Error),
      );
    });
  });

  describe('cluster mode', () => {
    it('creates a Redis.Cluster instance when clusterModeEnabled is true', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster',
        { ...baseConfig, clusterModeEnabled: true },
        logger,
      );

      expect(redis).toBeDefined();
      // Verify it's a cluster instance (has isCluster from our mock)
      expect((redis as any).isCluster).toBe(true);
    });

    it('passes startup nodes with host and port', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-nodes',
        {
          ...baseConfig,
          host: 'clustercfg.my-cache.use1.cache.amazonaws.com',
          port: 6190,
          clusterModeEnabled: true,
        },
        logger,
      );

      expect((redis as any).startupNodes).toEqual([
        { host: 'clustercfg.my-cache.use1.cache.amazonaws.com', port: 6190 },
      ]);
    });

    it('configures dnsLookup to bypass DNS resolution', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-dns',
        { ...baseConfig, clusterModeEnabled: true },
        logger,
      );

      const { dnsLookup } = (redis as any).options;
      expect(dnsLookup).toBeDefined();

      // dnsLookup should pass the address through unchanged
      const callback = vi.fn();
      dnsLookup('10.0.0.1', callback);
      expect(callback).toHaveBeenCalledWith(null, '10.0.0.1');
    });

    it('nests password, username, and connection options inside redisOptions', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-opts',
        { ...baseConfig, username: 'iam-user', clusterModeEnabled: true },
        logger,
      );

      const { redisOptions } = (redis as any).options;
      expect(redisOptions).toMatchObject({
        username: 'iam-user',
        password: 'test-password',
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    });

    it('sets TLS inside redisOptions when tlsEnabled is true', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-tls',
        { ...baseConfig, tlsEnabled: true, clusterModeEnabled: true },
        logger,
      );

      expect((redis as any).options.redisOptions.tls).toEqual({});
    });

    it('omits TLS inside redisOptions when tlsEnabled is false', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-no-tls',
        { ...baseConfig, clusterModeEnabled: true },
        logger,
      );

      expect((redis as any).options.redisOptions.tls).toBeUndefined();
    });

    it('includes clusterRetryStrategy that caps at 2000ms', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-retry',
        { ...baseConfig, clusterModeEnabled: true },
        logger,
      );

      const strategy = (redis as any).options.clusterRetryStrategy;
      expect(strategy).toBeDefined();
      expect(strategy(1)).toBe(500);
      expect(strategy(3)).toBe(1500);
      expect(strategy(5)).toBe(2000);
      expect(strategy(100)).toBe(2000);
    });

    it('includes reconnectOnError inside redisOptions that logs and returns 1', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-reconnect',
        { ...baseConfig, clusterModeEnabled: true },
        logger,
      );

      const handler = (redis as any).options.redisOptions.reconnectOnError;
      expect(handler).toBeDefined();
      expect(handler(new Error('MOVED'))).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('reconnectOnError'),
        expect.any(Error),
      );
    });

    it('does not create cluster when clusterModeEnabled is false/undefined', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-no-cluster', baseConfig, logger);

      expect((redis as any).isCluster).toBeUndefined();
    });
  });

  describe('event listeners', () => {
    it('attaches error listener that logs at error level', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-events', baseConfig, logger);

      redis.emit('error', new Error('connection refused'));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection error'),
        expect.any(Error),
        'test-events',
      );
    });

    it('logs errors on cluster instances the same way', () => {
      const logger = createMockLogger();
      const redis = createRedisClient(
        'test-cluster-err',
        { ...baseConfig, clusterModeEnabled: true },
        logger,
      );

      redis.emit('error', new Error('CLUSTERDOWN'));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection error'),
        expect.any(Error),
        'test-cluster-err',
      );
    });

    it('attaches connect listener that logs at debug level', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-connect', baseConfig, logger);

      redis.emit('connect');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection established'),
        'test-connect',
      );
    });

    it('attaches ready listener that logs at info level', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-ready', baseConfig, logger);

      redis.emit('ready');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection ready'),
        'test-ready',
      );
    });

    it('attaches close listener that logs at info level', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-close', baseConfig, logger);

      redis.emit('close');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection closed'),
        'test-close',
      );
    });

    it('attaches reconnecting listener', () => {
      const logger = createMockLogger();
      const redis = createRedisClient('test-reconnecting', baseConfig, logger);

      redis.emit('reconnecting', 500);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Redis reconnecting'),
        500,
        'test-reconnecting',
      );
    });
  });

  describe('return value', () => {
    it('returns the redis instance synchronously', () => {
      const logger = createMockLogger();
      const result = createRedisClient('sync-test', baseConfig, logger);

      // Verify it's not a promise
      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toBeDefined();
    });
  });
});
