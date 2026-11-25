import Redis from 'ioredis-mock';
import 'reflect-metadata';
import { parse } from 'graphql';
import { SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION } from '../lib/schema-explorer-flat-snapshot';
import { buildSchemaExplorerSnapshot } from '../lib/schema-explorer-snapshot';
import { SchemaExplorerCache } from './schema-explorer-cache';

let port = 1000;
/** ioredis-mock shares data between clients created with the same port. */
function createRedis() {
  return new Redis(port++);
}

function snapshotBuilder() {
  const build = vi.fn(async () =>
    buildSchemaExplorerSnapshot(parse(`type Query { hello(name: String = "you"): String }`), null),
  );
  return build;
}

const key = (id: string) =>
  `schema-explorer-snapshot:v${SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION}:${id}`;

test('builds on a miss, stores the binary snapshot in Redis and serves later reads from memory', async () => {
  const redis = createRedis();
  const cache = new SchemaExplorerCache(redis as any);
  const build = snapshotBuilder();

  const first = await cache.getOrBuild('version-1', build);
  expect(first?.getTypeEntity('Query')).toMatchObject({
    fields: [{ name: 'hello', args: [{ name: 'name', defaultValue: 'you' }] }],
  });
  expect(build).toHaveBeenCalledTimes(1);

  const stored = await redis.getBuffer(key('version-1'));
  expect(stored?.toString('latin1', 0, 3)).toBe('HSE');
  expect(await redis.ttl(key('version-1'))).toBeGreaterThan(0);

  expect(await cache.getOrBuild('version-1', build)).toBe(first);
  expect(build).toHaveBeenCalledTimes(1);
});

test('another instance (empty memory) reads the snapshot from Redis instead of building it', async () => {
  const redis = createRedis();
  const build = snapshotBuilder();
  await new SchemaExplorerCache(redis as any).getOrBuild('version-1', build);

  const otherInstance = new SchemaExplorerCache(redis as any);
  const reader = await otherInstance.getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
});

test('concurrent requests for a version share one build', async () => {
  const cache = new SchemaExplorerCache(createRedis() as any);
  const build = snapshotBuilder();

  const [a, b, c] = await Promise.all([
    cache.getOrBuild('version-1', build),
    cache.getOrBuild('version-1', build),
    cache.getOrBuild('version-1', build),
  ]);

  expect(build).toHaveBeenCalledTimes(1);
  expect(a).toBe(b);
  expect(b).toBe(c);
});

test('a stored snapshot of another format is rebuilt', async () => {
  const redis = createRedis();
  await redis.set(key('version-1'), Buffer.from('not a snapshot'));
  const build = snapshotBuilder();

  const reader = await new SchemaExplorerCache(redis as any).getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
  expect((await redis.getBuffer(key('version-1')))?.toString('latin1', 0, 3)).toBe('HSE');
});

test('versions without a schema are not cached', async () => {
  const redis = createRedis();
  const cache = new SchemaExplorerCache(redis as any);
  const build = vi.fn(async () => null);

  expect(await cache.getOrBuild('version-1', build)).toBe(null);
  expect(await cache.getOrBuild('version-1', build)).toBe(null);
  expect(build).toHaveBeenCalledTimes(2);
  expect(await redis.exists(key('version-1'))).toBe(0);
});

test('Redis errors do not fail the request', async () => {
  const failingRedis = {
    getBuffer: vi.fn(async () => {
      throw new Error('connection lost');
    }),
    setex: vi.fn(async () => {
      throw new Error('connection lost');
    }),
  };
  const cache = new SchemaExplorerCache(failingRedis as any);
  const build = snapshotBuilder();

  const reader = await cache.getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(failingRedis.setex).toHaveBeenCalledTimes(1);
  // Served from memory afterwards.
  await cache.getOrBuild('version-1', build);
  expect(build).toHaveBeenCalledTimes(1);
});
