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

  const result = await persistedDocuments.resolve('graphql-hive/v0.0.0/sha512:123');
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

  const result1 = await persistedDocuments.resolve('graphql-hive/v0.0.0/sha512:123');
  expect(result1).toEqual('{helloWorld}');
  const result2 = await persistedDocuments.resolve('graphql-hive/v0.0.0/sha512:456');
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
    persistedDocuments.resolve('graphql-hive/v0.0.0/sha512:123'),
  ).to.rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Failed to look up persisted operation.]`,
  );

  await expect(
    persistedDocuments.resolve('graphql-hive/v0.0.0/sha512:123'),
  ).to.rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Failed to look up persisted operation.]`,
  );

  expect((logWriter.logs.pop()?.attrs as any).error?.code).toEqual('EOPENBREAKER');
});
