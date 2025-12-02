import nock from 'nock';
import { describe, expect, test } from 'vitest';
import { createSupergraphSDLFetcher } from '../src/index.js';
import { version } from '../src/version';
import { maskRequestId } from './test-utils.js';

describe('supergraph SDL fetcher', async () => {
  test('createSupergraphSDLFetcher without ETag', async () => {
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const newSupergraphSdl = 'type NewSuperQuery { sdl: String }';
    const key = 'secret-key';
    nock('http://localhost')
      .get('/supergraph')
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(200, supergraphSdl, {
        ETag: 'first',
      })
      .get('/supergraph')
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .matchHeader('User-Agent', `hive-client/${version}`)
      .reply(200, newSupergraphSdl, {
        ETag: 'second',
      });

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
    });

    const result = await fetcher();

    expect(result.id).toBeDefined();
    expect(result.supergraphSdl).toEqual(supergraphSdl);

    const secondResult = await fetcher();

    expect(secondResult.id).toBeDefined();
    expect(secondResult.supergraphSdl).toEqual(newSupergraphSdl);
  });

  test('createSupergraphSDLFetcher', async () => {
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const newSupergraphSdl = 'type Query { sdl: String }';
    const key = 'secret-key';
    nock('http://localhost')
      .get('/supergraph')
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(200, supergraphSdl, {
        ETag: 'first',
      })
      .get('/supergraph')
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .matchHeader('If-None-Match', 'first')
      .reply(304)
      .get('/supergraph')
      .matchHeader('X-Hive-CDN-Key', key)
      .matchHeader('User-Agent', `hive-client/${version}`)
      .matchHeader('If-None-Match', 'first')
      .reply(200, newSupergraphSdl, {
        ETag: 'changed',
      });

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
    });

    const result = await fetcher();

    expect(result.id).toBeDefined();
    expect(result.supergraphSdl).toEqual(supergraphSdl);

    const cachedResult = await fetcher();

    expect(cachedResult.id).toBeDefined();
    expect(cachedResult.supergraphSdl).toEqual(supergraphSdl);

    const staleResult = await fetcher();

    expect(staleResult.id).toBeDefined();
    expect(staleResult.supergraphSdl).toEqual(newSupergraphSdl);
  });

  test('createSupergraphSDLFetcher retry with unexpected status code (nRetryCount=10)', async () => {
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const key = 'secret-key';
    nock('http://localhost')
      .get('/supergraph')
      .times(10)
      .reply(500)
      .get('/supergraph')
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(200, supergraphSdl, {
        ETag: 'first',
      });

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
    });

    const result = await fetcher();

    expect(result.id).toBeDefined();
    expect(result.supergraphSdl).toEqual(supergraphSdl);
  });

  test('createSupergraphSDLFetcher retry with unexpected status code (nRetryCount=11)', async () => {
    expect.assertions(1);
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const key = 'secret-key';
    nock('http://localhost')
      .get('/supergraph')
      .times(11)
      .reply(500)
      .get('/supergraph')
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(200, supergraphSdl, {
        ETag: 'first',
      });

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
    });

    try {
      await fetcher();
    } catch (err: any) {
      expect(maskRequestId(err.message)).toMatchInlineSnapshot(
        `GET http://localhost/supergraph (x-request-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) failed with status 500.`,
      );
    }
  });

  test('fetch override is invoked', async () => {
    let fetcherImplementationCallArgs: Parameters<typeof fetch>;
    const supergraphSdl = 'type SuperQuery { sdl: String }';

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key: 'bubatz',
      async fetchImplementation(...args): Promise<Response> {
        fetcherImplementationCallArgs = args;
        return new Response(supergraphSdl, {
          status: 200,
        });
      },
    });

    const result = await fetcher();
    expect(result).toMatchInlineSnapshot(`
      {
        id: cHnQuh1kIZhekOeaPxXiLtvOGplY9Beu//gftP9ppYo=,
        supergraphSdl: type SuperQuery { sdl: String },
      }
    `);

    expect(fetcherImplementationCallArgs![0]).toEqual(`http://localhost/supergraph`);
    expect(fetcherImplementationCallArgs![1]).toMatchObject({
      method: 'GET',
      headers: {
        'X-Hive-CDN-Key': 'bubatz',
      },
    });
  });

  test('extracts schemaVersionId from response header', async () => {
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const key = 'secret-key';
    const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
      async fetchImplementation(): Promise<Response> {
        return new Response(supergraphSdl, {
          status: 200,
          headers: {
            ETag: 'first',
            'x-hive-schema-version-id': versionId,
          },
        });
      },
    });

    const result = await fetcher();

    expect(result.schemaVersionId).toEqual(versionId);
    expect(result.supergraphSdl).toEqual(supergraphSdl);
  });

  test('uses versioned endpoint when schemaVersionId is provided', async () => {
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const key = 'secret-key';
    const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    nock('http://localhost')
      .get(`/version/${versionId}/supergraph`)
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(200, supergraphSdl, {
        ETag: 'immutable',
        'x-hive-schema-version-id': versionId,
      });

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
      schemaVersionId: versionId,
    });

    const result = await fetcher();

    expect(result.schemaVersionId).toEqual(versionId);
    expect(result.supergraphSdl).toEqual(supergraphSdl);
  });

  test('versioned endpoint with trailing /supergraph in base endpoint', async () => {
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const key = 'secret-key';
    const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    nock('http://localhost')
      .get(`/version/${versionId}/supergraph`)
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(200, supergraphSdl, {
        'x-hive-schema-version-id': versionId,
      });

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost/supergraph', // trailing /supergraph should be handled
      key,
      schemaVersionId: versionId,
    });

    const result = await fetcher();

    expect(result.schemaVersionId).toEqual(versionId);
  });

  test('versioned endpoint caches with ETag', async () => {
    const supergraphSdl = 'type SuperQuery { sdl: String }';
    const key = 'secret-key';
    const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    nock('http://localhost')
      .get(`/version/${versionId}/supergraph`)
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(200, supergraphSdl, {
        ETag: 'immutable-etag',
        'x-hive-schema-version-id': versionId,
      })
      .get(`/version/${versionId}/supergraph`)
      .once()
      .matchHeader('X-Hive-CDN-Key', key)
      .matchHeader('If-None-Match', 'immutable-etag')
      .reply(304);

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
      schemaVersionId: versionId,
    });

    const result = await fetcher();
    expect(result.supergraphSdl).toEqual(supergraphSdl);
    expect(result.schemaVersionId).toEqual(versionId);

    // Second fetch should use cached version via 304
    const cachedResult = await fetcher();
    expect(cachedResult.supergraphSdl).toEqual(supergraphSdl);
    expect(cachedResult.schemaVersionId).toEqual(versionId);
  });

  test('throws error for empty schemaVersionId', () => {
    expect(() =>
      createSupergraphSDLFetcher({
        endpoint: 'http://localhost',
        key: 'secret-key',
        schemaVersionId: '',
      }),
    ).toThrowError(
      'Invalid schemaVersionId: cannot be empty or whitespace. Provide a valid version ID or omit the option to fetch the latest version.',
    );
  });

  test('throws error for whitespace-only schemaVersionId', () => {
    expect(() =>
      createSupergraphSDLFetcher({
        endpoint: 'http://localhost',
        key: 'secret-key',
        schemaVersionId: '   ',
      }),
    ).toThrowError(
      'Invalid schemaVersionId: cannot be empty or whitespace. Provide a valid version ID or omit the option to fetch the latest version.',
    );
  });

  test('returns 404 error for non-existent schemaVersionId', async () => {
    const key = 'secret-key';
    const invalidVersionId = 'non-existent-version-id';

    nock('http://localhost')
      .get(`/version/${invalidVersionId}/supergraph`)
      .times(11)
      .matchHeader('X-Hive-CDN-Key', key)
      .reply(404, 'Not Found');

    const fetcher = createSupergraphSDLFetcher({
      endpoint: 'http://localhost',
      key,
      schemaVersionId: invalidVersionId,
    });

    await expect(fetcher()).rejects.toThrowError(
      /GET http:\/\/localhost\/version\/non-existent-version-id\/supergraph .* failed with status 404/,
    );
  });
});
