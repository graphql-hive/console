import { createCDNArtifactFetcher } from '../src';

test('can fetch artifact', async () => {
  const calls: Array<unknown> = [];
  const fetcher = createCDNArtifactFetcher({
    endpoint: 'https://cdn.localhost/artifacts/v1/target/sdl',
    accessKey: 'foobars',
    async fetch(input) {
      calls.push(input);
      return new Response('type Query { hello: String }', {
        headers: {
          'x-hive-schema-version-id': '69',
        },
      });
    },
  });

  const result = await fetcher.fetch();
  expect(result).toMatchInlineSnapshot(`
    {
      contents: type Query { hello: String },
      graphId: null,
      graphVersionId: 69,
      hash: lPMnu/9YxAJHyFqOBpHcrya5Bihef1wDGz7iKcif5nY=,
      lastModified: null,
      schemaVersionId: 69,
    }
  `);
  expect(calls).toMatchInlineSnapshot(`
    [
      https://cdn.localhost/artifacts/v1/target/sdl,
    ]
  `);
});

test('calls mirror if main source is not working', async () => {
  const calls: Array<unknown> = [];
  const fetcher = createCDNArtifactFetcher({
    endpoint: [
      'https://cdn.localhost/artifacts/v1/target/sdl',
      'https://cdn-mirror.localhost/artifacts/v1/target/sdl',
    ],
    accessKey: 'foobars',
    retry: false,
    circuitBreaker: {
      volumeThreshold: 1,
      errorThresholdPercentage: 1,
      resetTimeout: 30_000,
    },
    async fetch(input) {
      calls.push(input);

      if (calls.length === 1) {
        throw new Error('Network error or something.');
      }
      if (calls.length === 2) {
        return new Response('type Query { hello: String }', {
          headers: {
            'x-hive-schema-version-id': '69',
          },
        });
      }

      throw new Error('This should not happen');
    },
  });

  const result = await fetcher.fetch();
  expect(result).toMatchInlineSnapshot(`
    {
      contents: type Query { hello: String },
      graphId: null,
      graphVersionId: 69,
      hash: lPMnu/9YxAJHyFqOBpHcrya5Bihef1wDGz7iKcif5nY=,
      lastModified: null,
      schemaVersionId: 69,
    }
  `);
  expect(calls).toMatchInlineSnapshot(`
    [
      https://cdn.localhost/artifacts/v1/target/sdl,
      https://cdn-mirror.localhost/artifacts/v1/target/sdl,
    ]
  `);
});

test('updates the metadata from a 304 response', async () => {
  const calls: Array<Record<string, string>> = [];
  const fetcher = createCDNArtifactFetcher({
    endpoint: 'https://cdn.localhost/artifacts/v1/target/sdl',
    accessKey: 'foobars',
    async fetch(_input, init) {
      calls.push(init?.headers as Record<string, string>);

      if (calls.length === 1) {
        return new Response('type Query { hello: String }', {
          headers: {
            etag: '"abc"',
            'x-hive-graph-id': 'graph-1',
            'x-hive-graph-version-id': 'version-1',
            'last-modified': 'Wed, 28 Oct 2026 10:00:00 GMT',
          },
        });
      }

      return new Response(null, {
        status: 304,
        headers: {
          etag: '"abc"',
          'x-hive-graph-id': 'graph-2',
          'x-hive-graph-version-id': 'version-2',
          'last-modified': 'Thu, 29 Oct 2026 10:00:00 GMT',
        },
      });
    },
  });

  const firstResult = await fetcher.fetch();
  expect(firstResult.graphId).toBe('graph-1');

  const secondResult = await fetcher.fetch();
  expect(calls[1]['If-None-Match']).toBe('"abc"');
  expect(secondResult).toEqual({
    contents: firstResult.contents,
    hash: firstResult.hash,
    graphId: 'graph-2',
    graphVersionId: 'version-2',
    schemaVersionId: 'version-2',
    lastModified: 'Thu, 29 Oct 2026 10:00:00 GMT',
  });
});

test('keeps the cached metadata if a 304 response does not contain metadata', async () => {
  let callCount = 0;
  const fetcher = createCDNArtifactFetcher({
    endpoint: 'https://cdn.localhost/artifacts/v1/target/sdl',
    accessKey: 'foobars',
    async fetch() {
      callCount++;

      if (callCount === 1) {
        return new Response('type Query { hello: String }', {
          headers: {
            etag: '"abc"',
            'x-hive-graph-id': 'graph-1',
            'x-hive-graph-version-id': 'version-1',
          },
        });
      }

      return new Response(null, { status: 304 });
    },
  });

  const firstResult = await fetcher.fetch();
  const secondResult = await fetcher.fetch();
  expect(secondResult).toEqual(firstResult);
});
