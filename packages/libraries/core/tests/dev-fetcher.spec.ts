import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  composeSupergraphLocally,
  composeSupergraphRemotely,
  createDevFetcher,
  InvalidSupergraphResultError,
  LocalSupergraphCompositionError,
  RemoteSupergraphCompositionError,
  SupergraphRegistryApiError,
} from '../src/client/dev-fetcher';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

test('composes a valid supergraph from local services', async () => {
  const supergraphSdl = await composeSupergraphLocally([
    { name: 'a', url: 'http://a', sdl: 'type Query { hello: String }' },
  ]);

  expect(supergraphSdl).toContain('hello');
});

test('throws a LocalSupergraphCompositionError when local composition fails', async () => {
  await expect(
    composeSupergraphLocally([
      { name: 'a', url: 'http://a', sdl: 'type Query { hello: String }' },
      { name: 'b', url: 'http://b', sdl: 'type Query { hello: Int }' },
    ]),
  ).rejects.toThrow(LocalSupergraphCompositionError);
});

const remoteComposeArgs = {
  services: [{ name: 'a', url: 'http://a', sdl: 'type Query { hello: String }' }],
  registry: 'http://registry.localhost',
  token: 'secret-token',
  unstable__forceLatest: false,
  target: null,
  version: '1.2.3',
};

test('composes remotely and returns the supergraph SDL', async () => {
  const fetch = vi.fn().mockResolvedValue(
    jsonResponse({
      data: {
        schemaCompose: {
          __typename: 'SchemaComposeSuccess',
          valid: true,
          compositionResult: { supergraphSdl: 'remote supergraph sdl' },
        },
      },
    }),
  );

  const result = await composeSupergraphRemotely({ ...remoteComposeArgs, fetch });

  expect(result).toBe('remote supergraph sdl');
  expect(fetch).toHaveBeenCalledWith(
    'http://registry.localhost',
    expect.objectContaining({
      headers: expect.objectContaining({ authorization: 'Bearer secret-token' }),
    }),
  );
});

test('throws a SupergraphRegistryApiError when the registry returns a SchemaComposeError', async () => {
  const fetch = vi.fn().mockResolvedValue(
    jsonResponse({
      data: {
        schemaCompose: { __typename: 'SchemaComposeError', message: 'something went wrong' },
      },
    }),
  );

  await expect(composeSupergraphRemotely({ ...remoteComposeArgs, fetch })).rejects.toThrow(
    SupergraphRegistryApiError,
  );
});

test('throws a RemoteSupergraphCompositionError when remote composition is invalid with errors', async () => {
  const fetch = vi.fn().mockResolvedValue(
    jsonResponse({
      data: {
        schemaCompose: {
          __typename: 'SchemaComposeSuccess',
          valid: false,
          compositionResult: {
            supergraphSdl: null,
            errors: { edges: [{ node: { message: 'field conflict' } }] },
          },
        },
      },
    }),
  );

  const error = await composeSupergraphRemotely({ ...remoteComposeArgs, fetch }).catch(e => e);

  expect(error).toBeInstanceOf(RemoteSupergraphCompositionError);
  expect(error.errors).toEqual([{ message: 'field conflict' }]);
});

test('throws an InvalidSupergraphResultError when composition is valid but has no supergraph SDL', async () => {
  const fetch = vi.fn().mockResolvedValue(
    jsonResponse({
      data: {
        schemaCompose: {
          __typename: 'SchemaComposeSuccess',
          valid: true,
          compositionResult: { supergraphSdl: null },
        },
      },
    }),
  );

  await expect(composeSupergraphRemotely({ ...remoteComposeArgs, fetch })).rejects.toThrow(
    InvalidSupergraphResultError,
  );
});

test('does not recompose when resolved service SDLs are unchanged', async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async () =>
      jsonResponse({ data: { _service: { sdl: 'type Query { hello: String }' } } }),
    );
  const store = new Map<string, unknown>();

  const fetcher = createDevFetcher({
    services: [{ name: 'a', url: 'http://a' }],
    fetch,
    cache: {
      get: async key => store.get(key) as any,
      set: async (key, value) => {
        store.set(key, value);
      },
    },
  });

  const first = await fetcher.fetch();
  const second = await fetcher.fetch();

  expect(first).toBe(second);
  // one introspection call per `fetch()`, but composition only runs once (cached on the 2nd).
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('recomposes when a resolved service SDL changes', async () => {
  let sdl = 'type Query { hello: String }';
  const fetch = vi
    .fn()
    .mockImplementation(async () => jsonResponse({ data: { _service: { sdl } } }));
  const store = new Map<string, unknown>();

  const fetcher = createDevFetcher({
    services: [{ name: 'a', url: 'http://a' }],
    fetch,
    cache: {
      get: async key => store.get(key) as any,
      set: async (key, value) => {
        store.set(key, value);
      },
    },
  });

  const first = await fetcher.fetch();
  sdl = 'type Query { hello: Int }';
  const second = await fetcher.fetch();

  expect(first).not.toBe(second);
});

test('composes remotely when `remote` is enabled', async () => {
  const fetch = vi.fn().mockImplementation(async (url: string) => {
    if (url === 'http://a') {
      return jsonResponse({ data: { _service: { sdl: 'type Query { hello: String }' } } });
    }
    return jsonResponse({
      data: {
        schemaCompose: {
          __typename: 'SchemaComposeSuccess',
          valid: true,
          compositionResult: { supergraphSdl: 'remote supergraph sdl' },
        },
      },
    });
  });

  const fetcher = createDevFetcher({
    services: [{ name: 'a', url: 'http://a' }],
    remote: true,
    registry: 'http://registry.localhost',
    token: 'secret-token',
    unstable__forceLatest: true,
    version: '1.2.3',
    fetch,
  });

  const result = await fetcher.fetch();

  expect(result).toBe('remote supergraph sdl');
});

test('throws when `remote` is enabled without a registry or token', async () => {
  const fetcher = createDevFetcher({
    services: [],
    remote: true,
  });

  await expect(fetcher.fetch()).rejects.toThrow(
    '`registry` and `token` are required when `remote` is enabled.',
  );
});

test('resolves a relative schema file path against `cwd`', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'hive-dev-fetcher-'));
  await writeFile(join(cwd, 'a.graphql'), 'type Query { hello: String }', 'utf8');

  const fetcher = createDevFetcher({
    services: [{ name: 'a', url: 'http://a', source: 'file', schema: 'a.graphql' }],
    cwd,
  });

  const supergraphSdl = await fetcher.fetch();

  expect(supergraphSdl).toContain('hello');
});

test('uses federation introspection (`_service { sdl }`) by default', async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async () =>
      jsonResponse({ data: { _service: { sdl: 'type Query { hello: String }' } } }),
    );

  const fetcher = createDevFetcher({ services: [{ name: 'a', url: 'http://a' }], fetch });
  const supergraphSdl = await fetcher.fetch();

  expect(supergraphSdl).toContain('hello');
  const [, init] = fetch.mock.calls[0];
  expect(JSON.parse(init.body as string).query).toContain('_service');
});

test('uses standard GraphQL introspection when `source: "graphql"` is set', async () => {
  const fetch = vi.fn().mockImplementation(async () =>
    jsonResponse({
      data: {
        __schema: {
          queryType: { name: 'Query' },
          mutationType: null,
          subscriptionType: null,
          types: [
            {
              kind: 'OBJECT',
              name: 'Query',
              fields: [
                {
                  name: 'hello',
                  args: [],
                  type: { kind: 'SCALAR', name: 'String', ofType: null },
                  isDeprecated: false,
                },
              ],
              interfaces: [],
            },
            { kind: 'SCALAR', name: 'String' },
          ],
          directives: [],
        },
      },
    }),
  );

  const fetcher = createDevFetcher({
    services: [{ name: 'a', url: 'http://a', source: 'graphql' }],
    fetch,
  });

  const supergraphSdl = await fetcher.fetch();

  expect(supergraphSdl).toContain('hello');
  const [, init] = fetch.mock.calls[0];
  expect(JSON.parse(init.body as string).query).toContain('__schema');
});

test('does not fall back to standard introspection when federation introspection fails', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      jsonResponse({ errors: [{ message: 'Cannot query field "_service" on type "Query".' }] }),
    );

  const fetcher = createDevFetcher({ services: [{ name: 'a', url: 'http://a' }], fetch });

  await expect(fetcher.fetch()).rejects.toThrow(/federation introspection/);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('resolves each service with its own source', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'hive-dev-fetcher-'));
  await writeFile(join(cwd, 'a.graphql'), 'type Query { fileField: String }', 'utf8');

  const fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
    const { query } = JSON.parse(init.body as string);

    if (url === 'http://b') {
      expect(query).toContain('_service');
      return jsonResponse({
        data: { _service: { sdl: 'type Query { federationField: String }' } },
      });
    }

    expect(url).toBe('http://c');
    expect(query).toContain('__schema');
    return jsonResponse({
      data: {
        __schema: {
          queryType: { name: 'Query' },
          mutationType: null,
          subscriptionType: null,
          types: [
            {
              kind: 'OBJECT',
              name: 'Query',
              fields: [
                {
                  name: 'graphqlField',
                  args: [],
                  type: { kind: 'SCALAR', name: 'String', ofType: null },
                  isDeprecated: false,
                },
              ],
              interfaces: [],
            },
            { kind: 'SCALAR', name: 'String' },
          ],
          directives: [],
        },
      },
    });
  });

  const fetcher = createDevFetcher({
    services: [
      { name: 'a', url: 'http://a', source: 'file', schema: 'a.graphql' },
      { name: 'b', url: 'http://b', source: 'federation' },
      { name: 'c', url: 'http://c', source: 'graphql' },
    ],
    cwd,
    fetch,
  });

  const supergraphSdl = await fetcher.fetch();

  expect(supergraphSdl).toContain('fileField');
  expect(supergraphSdl).toContain('federationField');
  expect(supergraphSdl).toContain('graphqlField');
  expect(fetch).toHaveBeenCalledTimes(2);
});
