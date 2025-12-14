import { Logger, MemoryLogWriter } from '@graphql-hive/logger';
import { createPersistedDocuments } from '../src/client/persisted-documents';

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
    fail('Should have thrown an error');
  } catch (error: any) {
    // Verify the error has the correct properties for HTTP 400 status
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Invalid document ID "mytest~0.1.0~".*Hash cannot be empty/);
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
    fail('Should have thrown an error');
  } catch (error: any) {
    // Verify the error has the correct properties for HTTP 400 status
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Invalid document ID "invalid~format".*Expected format/);
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
    fail('Should have thrown an error');
  } catch (error: any) {
    // Verify the error has the correct properties for HTTP 400 status
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Invalid document ID "~0.1.0~hash123".*Name cannot be empty/);
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
    fail('Should have thrown an error');
  } catch (error: any) {
    // Verify the error has the correct properties for HTTP 400 status
    expect(error.code).toBe('INVALID_DOCUMENT_ID');
    expect(error.status).toBe(400);
    expect(error.message).toMatch(/Invalid document ID "name~~hash123".*Version cannot be empty/);
  }
});
