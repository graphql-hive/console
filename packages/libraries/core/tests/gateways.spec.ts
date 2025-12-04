import nock from 'nock';
import { createSchemaFetcher, createServicesFetcher } from '../src/client/gateways';
import { maskRequestId } from './test-utils.js';

afterEach(() => {
  nock.cleanAll();
});

test('createServicesFetcher without ETag', async () => {
  const schema = {
    sdl: 'type Query { noop: String }',
    url: 'service-url',
    name: 'service-name',
  };
  const newSchema = {
    sdl: 'type NewQuery { noop: String }',
    url: 'new-service-url',
    name: 'new-service-name',
  };
  const key = 'secret-key';
  nock('http://localhost')
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(() => [200, [schema]])
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(() => [200, [newSchema]]);

  const fetcher = createServicesFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const result = await fetcher();

  expect(result).toHaveLength(1);
  expect(result[0].id).toBeDefined();
  expect(result[0].name).toEqual(schema.name);
  expect(result[0].sdl).toEqual(schema.sdl);
  expect(result[0].url).toEqual(schema.url);

  const secondResult = await fetcher();

  expect(secondResult).toHaveLength(1);
  expect(secondResult[0].id).toBeDefined();
  expect(secondResult[0].name).toEqual(newSchema.name);
  expect(secondResult[0].sdl).toEqual(newSchema.sdl);
  expect(secondResult[0].url).toEqual(newSchema.url);
});

test('createServicesFetcher with ETag', async () => {
  const schema = {
    sdl: 'type Query { noop: String }',
    url: 'service-url',
    name: 'service-name',
  };
  const newSchema = {
    sdl: 'type NewQuery { noop: String }',
    url: 'new-service-url',
    name: 'new-service-name',
  };
  const key = 'secret-key';
  nock('http://localhost')
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(200, [schema], {
      ETag: 'first',
    })
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .matchHeader('If-None-Match', 'first')
    .reply(304)
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .matchHeader('If-None-Match', 'first')
    .reply(200, [newSchema], {
      ETag: 'changed',
    });

  const fetcher = createServicesFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const firstResult = await fetcher();

  expect(firstResult).toHaveLength(1);
  expect(firstResult[0].id).toBeDefined();
  expect(firstResult[0].name).toEqual(schema.name);
  expect(firstResult[0].sdl).toEqual(schema.sdl);
  expect(firstResult[0].url).toEqual(schema.url);

  const secondResult = await fetcher();

  expect(secondResult).toHaveLength(1);
  expect(secondResult[0].id).toBeDefined();
  expect(secondResult[0].name).toEqual(schema.name);
  expect(secondResult[0].sdl).toEqual(schema.sdl);
  expect(secondResult[0].url).toEqual(schema.url);

  const staleResult = await fetcher();

  expect(staleResult).toHaveLength(1);
  expect(staleResult[0].id).toBeDefined();
  expect(staleResult[0].name).toEqual(newSchema.name);
  expect(staleResult[0].sdl).toEqual(newSchema.sdl);
  expect(staleResult[0].url).toEqual(newSchema.url);
});

test('createSchemaFetcher without ETag (older versions)', async () => {
  const schema = {
    sdl: 'type Query { noop: String }',
    url: 'service-url',
    name: 'service-name',
  };
  const newSchema = {
    sdl: 'type NewQuery { noop: String }',
    url: 'new-service-url',
    name: 'new-service-name',
  };
  const key = 'secret-key';
  nock('http://localhost')
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(() => [200, schema])
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(() => [200, newSchema]);

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const result = await fetcher();

  expect(result.id).toBeDefined();
  expect(result.name).toEqual(schema.name);
  expect(result.sdl).toEqual(schema.sdl);
  expect(result.url).toEqual(schema.url);

  const newResult = await fetcher();

  expect(newResult.id).toBeDefined();
  expect(newResult.name).toEqual(newSchema.name);
  expect(newResult.sdl).toEqual(newSchema.sdl);
  expect(newResult.url).toEqual(newSchema.url);
});

test('createSchemaFetcher with ETag', async () => {
  const schema = {
    sdl: 'type Query { noop: String }',
    url: 'service-url',
    name: 'service-name',
  };
  const newSchema = {
    sdl: 'type NewQuery { noop: String }',
    url: 'new-service-url',
    name: 'new-service-name',
  };
  const key = 'secret-key';
  nock('http://localhost')
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(200, schema, {
      ETag: 'first',
    })
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .matchHeader('If-None-Match', 'first')
    .reply(304)
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .matchHeader('If-None-Match', 'first')
    .reply(200, newSchema, {
      ETag: 'changed',
    });

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const firstResult = await fetcher();

  expect(firstResult.id).toBeDefined();
  expect(firstResult.name).toEqual(schema.name);
  expect(firstResult.sdl).toEqual(schema.sdl);
  expect(firstResult.url).toEqual(schema.url);

  const secondResult = await fetcher();

  expect(secondResult.id).toBeDefined();
  expect(secondResult.name).toEqual(schema.name);
  expect(secondResult.sdl).toEqual(schema.sdl);
  expect(secondResult.url).toEqual(schema.url);

  const staleResult = await fetcher();

  expect(staleResult.id).toBeDefined();
  expect(staleResult.name).toEqual(newSchema.name);
  expect(staleResult.sdl).toEqual(newSchema.sdl);
  expect(staleResult.url).toEqual(newSchema.url);
});

test('retry in case of unexpected CDN status code (nRetryCount=10)', async () => {
  const schema = {
    sdl: 'type Query { noop: String }',
    url: 'service-url',
    name: 'service-name',
  };

  const key = 'secret-key';

  nock('http://localhost')
    .get('/services')
    .times(10)
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(500)
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(200, schema, {
      ETag: 'first',
    });

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const result = await fetcher();
  expect(result.id).toBeDefined();
  expect(result.name).toEqual(result.name);
  expect(result.sdl).toEqual(result.sdl);
  expect(result.url).toEqual(result.url);
});

test('fail in case of unexpected CDN status code (nRetryCount=11)', async () => {
  expect.assertions(1);
  const schema = {
    sdl: 'type Query { noop: String }',
    url: 'service-url',
    name: 'service-name',
  };

  const key = 'secret-key';

  nock('http://localhost')
    .get('/services')
    .times(11)
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(500)
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .matchHeader('accept', 'application/json')
    .reply(200, schema, {
      ETag: 'first',
    });

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
  });

  try {
    await fetcher();
  } catch (error: any) {
    expect(maskRequestId(error.message)).toMatchInlineSnapshot(
      `GET http://localhost/services (x-request-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) failed with status 500.`,
    );
  }
});

test('createSchemaFetcher extracts schemaVersionId from response header', async () => {
  const schema = {
    sdl: 'type Query { ping: String }',
    url: 'service-url',
    name: 'service-name',
  };
  const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const key = 'secret-key';

  nock('http://localhost')
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .reply(200, schema, {
      ETag: 'first',
      'x-hive-schema-version-id': versionId,
    });

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const result = await fetcher();

  expect(result.schemaVersionId).toEqual(versionId);
  expect(result.sdl).toEqual(schema.sdl);
});

test('createSchemaFetcher uses versioned endpoint when schemaVersionId option is provided', async () => {
  const schema = {
    sdl: 'type Query { ping: String }',
    url: 'service-url',
    name: 'service-name',
  };
  const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const key = 'secret-key';

  nock('http://localhost')
    .get(`/version/${versionId}/services`)
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .reply(200, schema, {
      'x-hive-schema-version-id': versionId,
    });

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
    schemaVersionId: versionId,
  });

  const result = await fetcher();

  expect(result.schemaVersionId).toEqual(versionId);
  expect(result.sdl).toEqual(schema.sdl);
});

test('createServicesFetcher extracts schemaVersionId into each item', async () => {
  const services = [
    { sdl: 'type Query { ping: String }', url: 'http://ping.com', name: 'ping' },
    { sdl: 'type Query { pong: String }', url: 'http://pong.com', name: 'pong' },
  ];
  const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const key = 'secret-key';

  nock('http://localhost')
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .reply(200, services, {
      ETag: 'first',
      'x-hive-schema-version-id': versionId,
    });

  const fetcher = createServicesFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const result = await fetcher();

  expect(result).toHaveLength(2);
  expect(result[0].schemaVersionId).toEqual(versionId);
  expect(result[1].schemaVersionId).toEqual(versionId);
  expect(result[0].name).toEqual('ping');
  expect(result[1].name).toEqual('pong');
});

test('createServicesFetcher uses versioned endpoint when schemaVersionId option is provided', async () => {
  const services = [{ sdl: 'type Query { ping: String }', url: 'http://ping.com', name: 'ping' }];
  const versionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const key = 'secret-key';

  nock('http://localhost')
    .get(`/version/${versionId}/services`)
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .reply(200, services, {
      'x-hive-schema-version-id': versionId,
    });

  const fetcher = createServicesFetcher({
    endpoint: 'http://localhost',
    key,
    schemaVersionId: versionId,
  });

  const result = await fetcher();

  expect(result).toHaveLength(1);
  expect(result[0].schemaVersionId).toEqual(versionId);
});

test('createSchemaFetcher omits schemaVersionId when header is absent', async () => {
  const schema = {
    sdl: 'type Query { ping: String }',
    url: 'service-url',
    name: 'service-name',
  };
  const key = 'secret-key';

  nock('http://localhost')
    .get('/services')
    .once()
    .matchHeader('X-Hive-CDN-Key', key)
    .reply(200, schema);

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
  });

  const result = await fetcher();

  expect(result.schemaVersionId).toBeUndefined();
  expect(result.sdl).toEqual(schema.sdl);
});

test('createSchemaFetcher throws error for empty schemaVersionId', () => {
  expect(() =>
    createSchemaFetcher({
      endpoint: 'http://localhost',
      key: 'secret-key',
      schemaVersionId: '',
    }),
  ).toThrowError(
    'Invalid schemaVersionId: cannot be empty or whitespace. Provide a valid version ID or omit the option to fetch the latest version.',
  );
});

test('createSchemaFetcher throws error for whitespace-only schemaVersionId', () => {
  expect(() =>
    createSchemaFetcher({
      endpoint: 'http://localhost',
      key: 'secret-key',
      schemaVersionId: '   ',
    }),
  ).toThrowError(
    'Invalid schemaVersionId: cannot be empty or whitespace. Provide a valid version ID or omit the option to fetch the latest version.',
  );
});

test('createSchemaFetcher returns 404 error for non-existent schemaVersionId', async () => {
  const key = 'secret-key';
  const invalidVersionId = 'non-existent-version-id';

  nock('http://localhost')
    .get(`/version/${invalidVersionId}/services`)
    .times(11)
    .matchHeader('X-Hive-CDN-Key', key)
    .reply(404, 'Not Found');

  const fetcher = createSchemaFetcher({
    endpoint: 'http://localhost',
    key,
    schemaVersionId: invalidVersionId,
  });

  await expect(fetcher()).rejects.toThrowError(
    /GET http:\/\/localhost\/version\/non-existent-version-id\/services .* failed with status 404/,
  );
});
