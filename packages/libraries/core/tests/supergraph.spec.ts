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
});
