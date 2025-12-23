import { Logger, MemoryLogWriter } from '@graphql-hive/logger';
import { createPersistedDocuments } from '../src/client/persisted-documents';
import { PERSISTED_DOCUMENT_NOT_FOUND } from '../src/client/types';

test('calls mirror if main source is not working', async () => {
  const logger = new Logger({ level: false });

  const calls: Array<unknown> = [];

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: [
        'https://cdn.localhost/artifacts/v1/target',
        'https://cdn-mirror.localhost/artifacts/v1/target',
      ],
      accessToken: 'foobars',
    },
    logger,
    async fetch(args) {
      calls.push(args);

      if (calls.length === 1) {
        throw new Error('Network error or something.');
      }
      if (calls.length === 2) {
        return new Response('{helloWorld}');
      }

      throw new Error('This should not happen');
    },
    retry: false,
    timeout: false,
  });

  const result = await persistedDocuments.resolve('graphql-hive~v0.0.0~sha512:123');
  expect(result).toEqual('{helloWorld}');
  expect(calls).toMatchInlineSnapshot(`
    [
      https://cdn.localhost/artifacts/v1/target/apps/graphql-hive/v0.0.0/sha512:123,
      https://cdn-mirror.localhost/artifacts/v1/target/apps/graphql-hive/v0.0.0/sha512:123,
    ]
  `);
});

test('does not use main source for repeated lookups', async () => {
  const logger = new Logger({ level: false });

  const calls: Array<unknown> = [];

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: [
        'https://cdn.localhost/artifacts/v1/target',
        'https://cdn-mirror.localhost/artifacts/v1/target',
      ],
      accessToken: 'foobars',
    },
    logger,
    async fetch(args) {
      calls.push(args);

      if (calls.length === 1) {
        throw new Error('Network error or something.');
      }
      if (calls.length === 2) {
        return new Response('{helloWorld}');
      }
      if (calls.length === 3) {
        return new Response('{foobars}');
      }

      throw new Error('This should not happen');
    },
    retry: false,
    timeout: false,
    circuitBreaker: {
      errorThresholdPercentage: 1,
      volumeThreshold: 1,
      resetTimeout: 30_000,
    },
  });

  const result1 = await persistedDocuments.resolve('graphql-hive~v0.0.0~sha512:123');
  expect(result1).toEqual('{helloWorld}');
  const result2 = await persistedDocuments.resolve('graphql-hive~v0.0.0~sha512:456');
  expect(result2).toEqual('{foobars}');
  expect(calls).toMatchInlineSnapshot(`
    [
      https://cdn.localhost/artifacts/v1/target/apps/graphql-hive/v0.0.0/sha512:123,
      https://cdn-mirror.localhost/artifacts/v1/target/apps/graphql-hive/v0.0.0/sha512:123,
      https://cdn-mirror.localhost/artifacts/v1/target/apps/graphql-hive/v0.0.0/sha512:456,
    ]
  `);
});

test('fails fast if circuit breaker kicks in', async () => {
  const logWriter = new MemoryLogWriter();
  const logger = new Logger({ level: 'debug', writers: [logWriter] });

  const calls: Array<unknown> = [];

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch(args) {
      calls.push(args);

      if (calls.length === 1) {
        throw new Error('Network error or something.');
      }

      throw new Error('This should not happen');
    },
    retry: false,
    timeout: false,
    circuitBreaker: {
      errorThresholdPercentage: 1,
      volumeThreshold: 1,
      resetTimeout: 30_000,
    },
  });

  await expect(
    persistedDocuments.resolve('graphql-hive~v0.0.0~sha512:123'),
  ).to.rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Failed to look up persisted operation.]`,
  );

  await expect(
    persistedDocuments.resolve('graphql-hive~v0.0.0~sha512:123'),
  ).to.rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Failed to look up persisted operation.]`,
  );

  expect((logWriter.logs.pop()?.attrs as any).error?.code).toEqual('EOPENBREAKER');
});

test('validates document ID format - missing hash', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch() {
      throw new Error('This should not be called');
    },
    retry: false,
    timeout: false,
  });

  // Test the malformed document ID from the task description
  await expect(
    persistedDocuments.resolve('client-name~client-version~'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[PersistedDocumentValidationError: Invalid document ID "client-name~client-version~": Hash cannot be empty. Expected format: "name~version~hash" (e.g., "client-name~client-version~hash")]`,
  );
});

test('validates document ID format - invalid parts count', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch() {
      throw new Error('This should not be called');
    },
    retry: false,
    timeout: false,
  });

  await expect(
    persistedDocuments.resolve('client-name~client-version'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[PersistedDocumentValidationError: Invalid document ID "client-name~client-version": Expected format: "name~version~hash" (e.g., "client-name~client-version~hash")]`,
  );
});

test('validates document ID format - empty parts', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch() {
      throw new Error('This should not be called');
    },
    retry: false,
    timeout: false,
  });

  await expect(
    persistedDocuments.resolve('~0.1.0~hash'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[PersistedDocumentValidationError: Invalid document ID "~0.1.0~hash": Name cannot be empty. Expected format: "name~version~hash"]`,
  );
});

test('allows valid document IDs to proceed normally', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch(_args) {
      return new Response('{helloWorld}');
    },
    retry: false,
    timeout: false,
  });

  // This should work fine and make the CDN request
  const result = await persistedDocuments.resolve('graphql-hive~v0.0.0~sha512:123');
  expect(result).toEqual('{helloWorld}');
});

test('validation errors return HTTP 400 status code - missing hash', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch() {
      throw new Error('This should not be called');
    },
    retry: false,
    timeout: false,
  });

  try {
    await persistedDocuments.resolve('mytest~0.1.0~');
    // Should not reach here - test should fail if no error is thrown
    throw new Error('Expected function to throw an error but it did not');
  } catch (error: any) {
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Hash cannot be empty/);
  }
});

test('validation errors return HTTP 400 status code - invalid format', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch() {
      throw new Error('This should not be called');
    },
    retry: false,
    timeout: false,
  });

  try {
    await persistedDocuments.resolve('invalid~format');
    // Should not reach here - test should fail if no error is thrown
    throw new Error('Expected function to throw an error but it did not');
  } catch (error: any) {
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Expected format/);
  }
});

test('validation errors return HTTP 400 status code - empty name', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch() {
      throw new Error('This should not be called');
    },
    retry: false,
    timeout: false,
  });

  try {
    await persistedDocuments.resolve('~0.1.0~hash123');
    // Should not reach here - test should fail if no error is thrown
    throw new Error('Expected function to throw an error but it did not');
  } catch (error: any) {
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Name cannot be empty/);
  }
});

test('validation errors return HTTP 400 status code - empty version', async () => {
  const logger = new Logger({ level: false });

  const persistedDocuments = createPersistedDocuments({
    cdn: {
      endpoint: 'https://cdn.localhost/artifacts/v1/target',
      accessToken: 'foobars',
    },
    logger,
    async fetch() {
      throw new Error('This should not be called');
    },
    retry: false,
    timeout: false,
  });

  try {
    await persistedDocuments.resolve('name~~hash123');
    // Should not reach here - test should fail if no error is thrown
    throw new Error('Expected function to throw an error but it did not');
  } catch (error: any) {
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Version cannot be empty/);
  }
});

describe('Layer 2 Cache', () => {
  test('L2 cache hit returns cached document without calling CDN', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue('query { cached }'),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch() {
        throw new Error('Should not call CDN when L2 cache hits');
      },
    });

    const result = await persistedDocuments.resolve('app~v1~hash');
    expect(result).toBe('query { cached }');
    expect(l2Cache.get).toHaveBeenCalledWith('app~v1~hash');
    // L2 set should not be called because document was already in L2
    expect(l2Cache.set).not.toHaveBeenCalled();
  });

  test('L2 cache miss falls through to CDN and writes back to L2', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(null), // cache miss
      set: vi.fn().mockResolvedValue(undefined),
    };
    const cdnCalls: string[] = [];

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch(url) {
        cdnCalls.push(String(url));
        return new Response('query { fromCdn }');
      },
    });

    const result = await persistedDocuments.resolve('app~v1~hash');
    expect(result).toBe('query { fromCdn }');
    expect(l2Cache.get).toHaveBeenCalledWith('app~v1~hash');
    expect(cdnCalls).toHaveLength(1);
    // Wait for async L2 write
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(l2Cache.set).toHaveBeenCalledWith('app~v1~hash', 'query { fromCdn }', undefined);
  });

  test('L2 cache negative hit returns null without calling CDN', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(PERSISTED_DOCUMENT_NOT_FOUND),
      set: vi.fn(),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch() {
        throw new Error('Should not call CDN when L2 has negative cache hit');
      },
    });

    const result = await persistedDocuments.resolve('app~v1~missing');
    expect(result).toBeNull();
    expect(l2Cache.get).toHaveBeenCalledWith('app~v1~missing');
  });

  test('L2 cache stores not-found with notFoundTtlSeconds', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: {
        cache: l2Cache,
        notFoundTtlSeconds: 120,
      },
      logger,
      async fetch() {
        return new Response('', { status: 404 });
      },
    });

    const result = await persistedDocuments.resolve('app~v1~notfound');
    expect(result).toBeNull();
    // Wait for async L2 write
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(l2Cache.set).toHaveBeenCalledWith('app~v1~notfound', PERSISTED_DOCUMENT_NOT_FOUND, {
      ttl: 120,
    });
  });

  test('L2 cache stores found documents with ttlSeconds', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: {
        cache: l2Cache,
        ttlSeconds: 3600,
        notFoundTtlSeconds: 60,
      },
      logger,
      async fetch() {
        return new Response('query { doc }');
      },
    });

    const result = await persistedDocuments.resolve('app~v1~hash');
    expect(result).toBe('query { doc }');
    // Wait for async L2 write
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(l2Cache.set).toHaveBeenCalledWith('app~v1~hash', 'query { doc }', { ttl: 3600 });
  });

  test('L2 cache failure gracefully falls through to CDN', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      set: vi.fn(),
    };
    const cdnCalls: string[] = [];

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch(url) {
        cdnCalls.push(String(url));
        return new Response('query { fallback }');
      },
    });

    const result = await persistedDocuments.resolve('app~v1~hash');
    expect(result).toBe('query { fallback }');
    expect(cdnCalls).toHaveLength(1);
  });

  test('L2 cache with read-only implementation (no set method)', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(null),
      // No set method - read-only cache
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch() {
        return new Response('query { doc }');
      },
    });

    // Should not throw when no set method
    const result = await persistedDocuments.resolve('app~v1~hash');
    expect(result).toBe('query { doc }');
  });

  test('negative caching disabled when notFoundTtlSeconds is 0', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: {
        cache: l2Cache,
        notFoundTtlSeconds: 0, // Disable negative caching
      },
      logger,
      async fetch() {
        return new Response('', { status: 404 });
      },
    });

    await persistedDocuments.resolve('app~v1~notfound');
    // Wait for potential async L2 write
    await new Promise(resolve => setTimeout(resolve, 10));
    // set should not be called for not-found when notFoundTtlSeconds is 0
    expect(l2Cache.set).not.toHaveBeenCalled();
  });

  test('L2 cache set failure does not break the request', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error('Redis write failed')),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch() {
        return new Response('query { doc }');
      },
    });

    // Request should succeed even if L2 set fails
    const result = await persistedDocuments.resolve('app~v1~hash');
    expect(result).toBe('query { doc }');
    // Wait for async L2 write attempt
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(l2Cache.set).toHaveBeenCalled();
  });

  test('L1 cache is populated from L2 cache hit', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue('query { cached }'),
      set: vi.fn(),
    };
    let fetchCallCount = 0;

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch() {
        fetchCallCount++;
        throw new Error('Should not call CDN');
      },
    });

    // First call - hits L2, should populate L1
    const result1 = await persistedDocuments.resolve('app~v1~hash');
    expect(result1).toBe('query { cached }');
    expect(l2Cache.get).toHaveBeenCalledTimes(1);

    // Second call - should hit L1 directly, not L2
    const result2 = await persistedDocuments.resolve('app~v1~hash');
    expect(result2).toBe('query { cached }');
    // L2 get should still only be called once
    expect(l2Cache.get).toHaveBeenCalledTimes(1);
    expect(fetchCallCount).toBe(0);
  });

  test('L1 cache is populated from L2 negative cache hit', async () => {
    const logger = new Logger({ level: false });
    const l2Cache = {
      get: vi.fn().mockResolvedValue(PERSISTED_DOCUMENT_NOT_FOUND),
      set: vi.fn(),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch() {
        throw new Error('Should not call CDN');
      },
    });

    // First call - hits L2 negative cache, should populate L1
    const result1 = await persistedDocuments.resolve('app~v1~missing');
    expect(result1).toBeNull();
    expect(l2Cache.get).toHaveBeenCalledTimes(1);

    // Second call - should hit L1 directly (with null value), not L2
    const result2 = await persistedDocuments.resolve('app~v1~missing');
    expect(result2).toBeNull();
    // L2 get should still only be called once
    expect(l2Cache.get).toHaveBeenCalledTimes(1);
  });

  test('concurrent requests are deduplicated when hitting L2 cache', async () => {
    const logger = new Logger({ level: false });
    let l2GetCallCount = 0;
    const l2Cache = {
      get: vi.fn().mockImplementation(async () => {
        l2GetCallCount++;
        // Simulate some latency
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'query { cached }';
      }),
      set: vi.fn(),
    };

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      layer2Cache: { cache: l2Cache },
      logger,
      async fetch() {
        throw new Error('Should not call CDN');
      },
    });

    // Fire multiple concurrent requests for the same document
    const promises = [
      persistedDocuments.resolve('app~v1~hash'),
      persistedDocuments.resolve('app~v1~hash'),
      persistedDocuments.resolve('app~v1~hash'),
    ];

    const results = await Promise.all(promises);

    // All should get the same result
    expect(results).toEqual(['query { cached }', 'query { cached }', 'query { cached }']);
    // L2 cache should only be called once due to request deduplication
    expect(l2GetCallCount).toBe(1);
  });

  test('without layer2Cache configured, behaves as before', async () => {
    const logger = new Logger({ level: false });
    const cdnCalls: string[] = [];

    const persistedDocuments = createPersistedDocuments({
      cdn: {
        endpoint: 'https://cdn.localhost/artifacts/v1/target',
        accessToken: 'foobars',
      },
      // No layer2Cache configured
      logger,
      async fetch(url) {
        cdnCalls.push(String(url));
        return new Response('query { fromCdn }');
      },
    });

    const result = await persistedDocuments.resolve('app~v1~hash');
    expect(result).toBe('query { fromCdn }');
    expect(cdnCalls).toHaveLength(1);
  });
});
