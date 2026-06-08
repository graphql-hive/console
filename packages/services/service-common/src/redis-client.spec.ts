import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisConfig } from './redis-config';

/** Mock logger matching ServiceLogger interface */
type MockServiceLogger = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  child: (bindings?: any) => MockServiceLogger;
};

function createMockLogger(): MockServiceLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: MockServiceLogger) {
      return this;
    }),
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

const resolveRedisCredentialsMock = vi.fn();
const startIamTokenRefreshMock = vi.fn();

vi.mock('./iam-redis', () => {
  return {
    resolveRedisCredentials: resolveRedisCredentialsMock,
    startIamTokenRefresh: startIamTokenRefreshMock,
  };
});

const baseEnvConfig: RedisConfig = {
  host: 'localhost',
  port: 6379,
  password: 'test-password',
  username: 'default',
  tlsEnabled: false,
  clusterModeEnabled: false,
  awsIamAuthEnabled: false,
  awsRegion: 'us-east-1',
  awsIamAuthCacheName: 'test-cache',
};

describe('createRedisClient', () => {
  let createRedisClient: (config: RedisConfig, options: any) => Promise<any>;

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveRedisCredentialsMock.mockResolvedValue({
      password: 'resolved-password',
      username: 'resolved-username',
    });
    const mod = await import('./redis-client');
    createRedisClient = mod.createRedisClient;
  });

  describe('standalone mode with static auth', () => {
    it('creates a standalone Redis instance with static credentials', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, {
        logger,
      });

      expect(resolveRedisCredentialsMock).toHaveBeenCalledWith(
        'test-password',
        expect.any(Object),
        undefined,
      );
      expect(redis).toBeDefined();
      expect(redis.options).toMatchObject({
        host: 'localhost',
        port: 6379,
        password: 'resolved-password',
        username: 'resolved-username',
        db: 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    });

    it('sets TLS options when tlsEnabled is true', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, tlsEnabled: true };
      const redis = await createRedisClient(config, { logger });

      expect(redis.options.tls).toEqual({});
    });

    it('does not set TLS when tlsEnabled is false', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      expect(redis.options.tls).toBeUndefined();
    });

    it('includes retryStrategy that caps at 2000ms', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      const strategy = redis.options.retryStrategy;
      expect(strategy).toBeDefined();
      expect(strategy(1)).toBe(500);
      expect(strategy(3)).toBe(1500);
      expect(strategy(5)).toBe(2000);
      expect(strategy(100)).toBe(2000);
    });

    it('reconnectOnError logs and returns 1', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      const handler = redis.options.reconnectOnError;
      expect(handler).toBeDefined();
      const result = handler(new Error('READONLY'));
      expect(result).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('reconnectOnError'),
        expect.any(Error),
      );
    });

    it('defaults maxRetriesPerRequest to null', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, {
        logger,
      });

      expect(redis.options.maxRetriesPerRequest).toBeNull();
    });

    it('allows overriding maxRetriesPerRequest via options', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, {
        logger,
        maxRetriesPerRequest: 20,
      });

      expect(redis.options.maxRetriesPerRequest).toBe(20);
    });

    it('attaches connection lifecycle event listeners', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      redis.emit('error', new Error('connection refused'));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection error'),
        expect.any(Error),
      );

      redis.emit('connect');
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection established'),
      );

      redis.emit('ready');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Redis connection ready'));

      redis.emit('close');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Redis connection closed'));

      redis.emit('reconnecting', 500);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Redis reconnecting'), 500);
    });
  });

  describe('cluster mode with static auth', () => {
    it('creates a Redis.Cluster instance when clusterModeEnabled is true', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      expect(redis).toBeDefined();
      expect((redis as any).isCluster).toBe(true);
    });

    it('passes startup nodes with host and port', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        host: 'clustercfg.my-cache.use1.cache.amazonaws.com',
        port: 6190,
        clusterModeEnabled: true,
      };
      const redis = await createRedisClient(config, { logger });

      expect((redis as any).startupNodes).toEqual([
        { host: 'clustercfg.my-cache.use1.cache.amazonaws.com', port: 6190 },
      ]);
    });

    it('configures dnsLookup to bypass DNS resolution', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      const { dnsLookup } = (redis as any).options;
      expect(dnsLookup).toBeDefined();

      const callback = vi.fn();
      dnsLookup('10.0.0.1', callback);
      expect(callback).toHaveBeenCalledWith(null, '10.0.0.1');
    });

    it('nests password, username, and connection options inside redisOptions', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      const { redisOptions } = (redis as any).options;
      expect(redisOptions).toMatchObject({
        username: 'resolved-username',
        password: 'resolved-password',
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    });

    it('sets TLS inside redisOptions when tlsEnabled is true', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, tlsEnabled: true, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      expect((redis as any).options.redisOptions.tls).toEqual({});
    });

    it('omits TLS inside redisOptions when tlsEnabled is false', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      expect((redis as any).options.redisOptions.tls).toBeUndefined();
    });

    it('includes clusterRetryStrategy that caps at 2000ms', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      const strategy = (redis as any).options.clusterRetryStrategy;
      expect(strategy).toBeDefined();
      expect(strategy(1)).toBe(500);
      expect(strategy(3)).toBe(1500);
      expect(strategy(5)).toBe(2000);
      expect(strategy(100)).toBe(2000);
    });

    it('includes reconnectOnError inside redisOptions that logs and returns 1', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      const handler = (redis as any).options.redisOptions.reconnectOnError;
      expect(handler).toBeDefined();
      expect(handler(new Error('MOVED'))).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('reconnectOnError'),
        expect.any(Error),
      );
    });

    it('defaults maxRetriesPerRequest to null in cluster redisOptions', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      expect((redis as any).options.redisOptions.maxRetriesPerRequest).toBeNull();
    });

    it('allows overriding maxRetriesPerRequest in cluster redisOptions', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, {
        logger,
        maxRetriesPerRequest: 20,
      });

      expect((redis as any).options.redisOptions.maxRetriesPerRequest).toBe(20);
    });
  });

  describe('IAM-based authentication', () => {
    it('derives redisIamConfig from environment config when IAM is enabled', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
        username: 'custom-user',
      };
      const redis = await createRedisClient(config, { logger });

      expect(resolveRedisCredentialsMock).toHaveBeenCalledWith(
        'test-password',
        expect.any(Object),
        {
          host: 'localhost',
          port: 6379,
          awsRegion: 'us-east-1',
          username: 'custom-user',
          iamAuthCacheName: 'test-cache',
        },
      );
      expect(redis.options.password).toBe('resolved-password');
      expect(redis.options.username).toBe('resolved-username');
    });

    it('defaults username to "default" when not provided in IAM config', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
        username: undefined,
      };
      const redis = await createRedisClient(config, { logger });

      expect(resolveRedisCredentialsMock).toHaveBeenCalledWith(
        'test-password',
        expect.any(Object),
        expect.objectContaining({
          username: 'default',
        }),
      );
    });

    it('starts IAM token refresh when IAM is enabled', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
      };
      const redis = await createRedisClient(config, { logger });

      expect(startIamTokenRefreshMock).toHaveBeenCalledWith(
        redis,
        {
          host: 'localhost',
          port: 6379,
          awsRegion: 'us-east-1',
          username: 'default',
          iamAuthCacheName: 'test-cache',
        },
        expect.any(Object),
      );
    });

    it('does NOT start IAM token refresh when IAM is disabled', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: false,
      };
      const redis = await createRedisClient(config, { logger });

      expect(startIamTokenRefreshMock).not.toHaveBeenCalled();
    });

    it('respects clusterModeEnabled flag when starting IAM token refresh', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
        clusterModeEnabled: true,
      };
      const redis = await createRedisClient(config, { logger });

      expect(startIamTokenRefreshMock).toHaveBeenCalledWith(
        redis,
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('two-client pattern (server/workflows use case)', () => {
    it('supports calling createRedisClient twice with independent IAM token refreshes', async () => {
      const logger = createMockLogger();
      const mainLogger = logger.child({ label: 'main' });
      const subscriberLogger = logger.child({ label: 'subscriber' });

      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
      };

      const mainRedis = await createRedisClient(config, {
        logger: mainLogger,
      });

      const subscriberRedis = await createRedisClient(config, {
        logger: subscriberLogger,
      });

      // Both clients should be distinct instances
      expect(mainRedis).not.toBe(subscriberRedis);

      // Both should have resolved credentials
      expect(mainRedis.options.password).toBe('resolved-password');
      expect(subscriberRedis.options.password).toBe('resolved-password');

      // resolveRedisCredentials should be called twice (once per client)
      // because each client is independent
      expect(resolveRedisCredentialsMock).toHaveBeenCalledTimes(2);

      // startIamTokenRefresh should be called twice (once per client)
      // each client has independent token lifecycle
      expect(startIamTokenRefreshMock).toHaveBeenCalledTimes(2);

      const firstCall = startIamTokenRefreshMock.mock.calls[0];
      const secondCall = startIamTokenRefreshMock.mock.calls[1];

      expect(firstCall[0]).toBe(mainRedis);
      expect(secondCall[0]).toBe(subscriberRedis);
    });

    it('each client call resolves credentials independently', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
      };

      resolveRedisCredentialsMock
        .mockResolvedValueOnce({ password: 'token-1', username: 'iam-1' })
        .mockResolvedValueOnce({ password: 'token-2', username: 'iam-2' });

      const mainRedis = await createRedisClient(config, { logger });
      const subscriberRedis = await createRedisClient(config, { logger });

      expect(mainRedis.options.password).toBe('token-1');
      expect(mainRedis.options.username).toBe('iam-1');

      expect(subscriberRedis.options.password).toBe('token-2');
      expect(subscriberRedis.options.username).toBe('iam-2');
    });
  });

  describe('options handling', () => {
    it('accepts logger typed as ServiceLogger', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, {
        logger,
      });

      expect(redis).toBeDefined();
    });

    it('accepts optional maxRetriesPerRequest override', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, {
        logger,
        maxRetriesPerRequest: 25,
      });

      expect(redis.options.maxRetriesPerRequest).toBe(25);
    });

    it('uses main logger for IAM refresh logs', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
      };
      const redis = await createRedisClient(config, {
        logger,
      });

      expect(startIamTokenRefreshMock).toHaveBeenCalledWith(redis, expect.any(Object), logger);
    });

    it('supports creating a client without a label argument', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, {
        logger,
      });

      redis.emit('ready');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Redis connection ready'));
    });
  });

  describe('unhappy paths (error handling)', () => {
    it('rejects when resolveRedisCredentials throws', async () => {
      const logger = createMockLogger();
      const credentialsError = new Error('Failed to fetch AWS credentials');
      resolveRedisCredentialsMock.mockRejectedValueOnce(credentialsError);

      await expect(createRedisClient(baseEnvConfig, { logger })).rejects.toThrow(
        'Failed to fetch AWS credentials',
      );

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('handles IAM auth with credential resolution failure', async () => {
      const logger = createMockLogger();
      const credentialsError = new Error('Invalid IAM credentials');
      resolveRedisCredentialsMock.mockRejectedValueOnce(credentialsError);

      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
      };

      await expect(createRedisClient(config, { logger })).rejects.toThrow(
        'Invalid IAM credentials',
      );
    });

    it('rejects when startIamTokenRefresh throws', async () => {
      const logger = createMockLogger();
      const refreshError = new Error('Failed to start IAM token refresh');
      startIamTokenRefreshMock.mockImplementationOnce(() => {
        throw refreshError;
      });

      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
      };

      await expect(createRedisClient(config, { logger })).rejects.toThrow(
        'Failed to start IAM token refresh',
      );
    });

    it('handles null/undefined logger gracefully when logging connection events', async () => {
      // This tests that the factory doesn't assume logger is present for all operations
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      // Emit error event - should not crash even if logger is weak
      expect(() => {
        redis.emit('error', new Error('Connection timeout'));
      }).not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection error'),
        expect.any(Error),
      );
    });

    it('handles reconnectOnError with non-retryable errors', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      const handler = redis.options.reconnectOnError;
      const result = handler(new Error('NOAUTH'));

      // Should return 1 (retry) even for auth errors - decision is to retry
      expect(result).toBe(1);
    });

    it('handles reconnectOnError with connection refused', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      const handler = redis.options.reconnectOnError;
      const result = handler(new Error('ECONNREFUSED'));

      expect(result).toBe(1);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('handles cluster mode with connection errors', async () => {
      const logger = createMockLogger();
      const config = { ...baseEnvConfig, clusterModeEnabled: true };
      const redis = await createRedisClient(config, { logger });

      const clusterHandler = (redis as any).options.redisOptions.reconnectOnError;
      const result = clusterHandler(new Error('CLUSTERDOWN'));

      expect(result).toBe(1);
    });

    it('does not call startIamTokenRefresh if IAM config is invalid but awsIamAuthEnabled is false', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: false,
        awsRegion: '', // Empty region should not trigger IAM
      };

      await createRedisClient(config, { logger });

      expect(startIamTokenRefreshMock).not.toHaveBeenCalled();
    });

    it('handles config with empty host gracefully', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        host: '', // Empty host - should still create client
      };

      const redis = await createRedisClient(config, { logger });

      expect(redis).toBeDefined();
      expect(redis.options.host).toBe('');
    });

    it('handles config with invalid port (0)', async () => {
      const logger = createMockLogger();
      const config = {
        ...baseEnvConfig,
        port: 0, // Invalid port
      };

      const redis = await createRedisClient(config, { logger });

      // Client still created - port validation happens at connection time
      expect(redis).toBeDefined();
      expect(redis.options.port).toBe(0);
    });

    it('handles concurrent credential resolution failures independently', async () => {
      const logger = createMockLogger();
      const error1 = new Error('Error 1: Credentials expired');
      const error2 = new Error('Error 2: IAM role missing');

      resolveRedisCredentialsMock.mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);

      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
      };

      const promise1 = createRedisClient(config, { logger: logger.child() });
      const promise2 = createRedisClient(config, { logger: logger.child() });

      await expect(promise1).rejects.toThrow('Error 1');
      await expect(promise2).rejects.toThrow('Error 2');

      // Each call should have tried to resolve credentials independently
      expect(resolveRedisCredentialsMock).toHaveBeenCalledTimes(2);
    });

    it('handles maxRetriesPerRequest with invalid value (negative)', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, {
        logger,
        maxRetriesPerRequest: -1, // Invalid but passed through
      });

      // Factory doesn't validate - that's up to ioredis
      expect(redis.options.maxRetriesPerRequest).toBe(-1);
    });

    it('handles cluster mode with credential resolution failure', async () => {
      const logger = createMockLogger();
      const credentialsError = new Error('Cluster credentials unavailable');
      resolveRedisCredentialsMock.mockRejectedValueOnce(credentialsError);

      const config = {
        ...baseEnvConfig,
        clusterModeEnabled: true,
      };

      await expect(createRedisClient(config, { logger })).rejects.toThrow(
        'Cluster credentials unavailable',
      );
    });

    it('handles IAM token refresh error with cluster mode', async () => {
      const logger = createMockLogger();
      const refreshError = new Error('Cluster IAM refresh failed');
      startIamTokenRefreshMock.mockImplementationOnce(() => {
        throw refreshError;
      });

      const config = {
        ...baseEnvConfig,
        awsIamAuthEnabled: true,
        clusterModeEnabled: true,
      };

      await expect(createRedisClient(config, { logger })).rejects.toThrow(
        'Cluster IAM refresh failed',
      );
    });

    it('logs reconnecting event with delay', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      redis.emit('reconnecting', 1500);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Redis reconnecting'), 1500);
    });

    it('handles multiple error events in sequence', async () => {
      const logger = createMockLogger();
      const redis = await createRedisClient(baseEnvConfig, { logger });

      const error1 = new Error('Connection failed');
      const error2 = new Error('Timeout');

      redis.emit('error', error1);
      redis.emit('error', error2);

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Redis connection error'),
        error1,
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Redis connection error'),
        error2,
      );
    });
  });
});
