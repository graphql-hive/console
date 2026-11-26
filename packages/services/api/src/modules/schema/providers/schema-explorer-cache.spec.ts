import { zstdDecompressSync } from 'node:zlib';
import Redis from 'ioredis-mock';
import 'reflect-metadata';
import {
  buildSchemaExplorerSnapshotBuffer,
  schemaExplorerSnapshotKey as key,
  SchemaExplorerSnapshotReader,
  writeSchemaExplorerSnapshot,
} from '@hive/schema-explorer-snapshot';
import { metrics } from '@hive/service-common';
import { SchemaExplorerCache, SchemaExplorerCacheConfig } from './schema-explorer-cache';

let port = 1000;
/** ioredis-mock shares data between clients created with the same port. */
function createRedis() {
  return new Redis(port++);
}

/** A cache like one API instance's, with the default 512 MB memory limit unless given. */
function createCache(redis: unknown, memoryMaxBytes = 512 * 1024 * 1024) {
  return new SchemaExplorerCache(
    redis as any,
    new SchemaExplorerCacheConfig({ memoryMaxBytes, buildTimeoutMs: 30_000 }),
  );
}

const snapshot = buildSchemaExplorerSnapshotBuffer({
  compositeSdl: `type Query { hello(name: String = "you"): String }`,
  supergraphSdl: null,
});

/** Stands in for the workflows service: stores the snapshot in Redis, as the build task does. */
function workflow(redis: InstanceType<typeof Redis>) {
  return vi.fn(async (schemaVersionId: string) => {
    await writeSchemaExplorerSnapshot(redis, schemaVersionId, snapshot);
    return true;
  });
}

/** The stored value, decompressed. */
async function storedSnapshot(redis: InstanceType<typeof Redis>, id: string) {
  const stored = await redis.getBuffer(key(id));
  return stored ? zstdDecompressSync(stored) : null;
}

test('a miss waits for the build, reads the snapshot from Redis and serves later reads from memory', async () => {
  const redis = createRedis();
  const cache = createCache(redis);
  const build = workflow(redis);

  const first = await cache.getOrBuild('version-1', () => build('version-1'));
  expect(first?.getTypeEntity('Query')).toMatchObject({
    fields: [{ name: 'hello', args: [{ name: 'name', defaultValue: 'you' }] }],
  });
  expect(build).toHaveBeenCalledTimes(1);

  const stored = await redis.getBuffer(key('version-1'));
  const decompressed = await storedSnapshot(redis, 'version-1');
  expect(decompressed?.toString('latin1', 0, 3)).toBe('HSE');
  // Stored compressed.
  expect(stored!.length).toBeLessThan(decompressed!.length);
  expect(await redis.ttl(key('version-1'))).toBeGreaterThan(0);

  expect(await cache.getOrBuild('version-1', () => build('version-1'))).toBe(first);
  expect(build).toHaveBeenCalledTimes(1);
});

test('another instance (empty memory) reads the snapshot from Redis instead of building it', async () => {
  const redis = createRedis();
  const build = workflow(redis);
  await createCache(redis).getOrBuild('version-1', () => build('version-1'));

  const otherInstance = createCache(redis);
  const reader = await otherInstance.getOrBuild('version-1', () => build('version-1'));

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
});

test('concurrent requests for a version share one build', async () => {
  const redis = createRedis();
  const cache = createCache(redis);
  const build = workflow(redis);

  const [a, b, c] = await Promise.all([
    cache.getOrBuild('version-1', () => build('version-1')),
    cache.getOrBuild('version-1', () => build('version-1')),
    cache.getOrBuild('version-1', () => build('version-1')),
  ]);

  expect(build).toHaveBeenCalledTimes(1);
  expect(a).toBe(b);
  expect(b).toBe(c);
});

test('a stored snapshot of another format is rebuilt', async () => {
  const redis = createRedis();
  await redis.set(key('version-1'), Buffer.from('not a snapshot'));
  const build = workflow(redis);

  const reader = await createCache(redis).getOrBuild('version-1', () => build('version-1'));

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
  expect((await storedSnapshot(redis, 'version-1'))?.toString('latin1', 0, 3)).toBe('HSE');
});

test('an uncompressed snapshot in Redis is rebuilt', async () => {
  const redis = createRedis();
  await redis.set(key('version-1'), snapshot);
  const build = workflow(redis);

  const reader = await createCache(redis).getOrBuild('version-1', () => build('version-1'));

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
  expect((await storedSnapshot(redis, 'version-1'))?.equals(snapshot)).toBe(true);
});

test('versions without a schema are not cached', async () => {
  const redis = createRedis();
  const cache = createCache(redis);
  const build = vi.fn(async () => false);

  expect(await cache.getOrBuild('version-1', build)).toBe(null);
  expect(await cache.getOrBuild('version-1', build)).toBe(null);
  expect(build).toHaveBeenCalledTimes(2);
  expect(await redis.exists(key('version-1'))).toBe(0);
});

test('a failing Redis read counts as a miss', async () => {
  const redis = createRedis();
  // The first read fails, later ones reach Redis.
  vi.spyOn(redis, 'getBuffer').mockImplementationOnce(async () => {
    throw new Error('connection lost');
  });
  const build = workflow(redis);

  const reader = await createCache(redis).getOrBuild('version-1', () => build('version-1'));

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
});

test('a build whose snapshot cannot be read from Redis fails the request', async () => {
  const cache = createCache(createRedis());

  await expect(cache.getOrBuild('version-1', async () => true)).rejects.toThrow(
    'could not be read from Redis',
  );
  // Not cached: the next request builds again.
  const build = vi.fn(async () => false);
  expect(await cache.getOrBuild('version-1', build)).toBe(null);
  expect(build).toHaveBeenCalledTimes(1);
});

describe('metrics', () => {
  /** The current value of a metric sample (a histogram's `_count` when `sample` says so). */
  async function value(name: string, labels: Record<string, string> = {}, sample = name) {
    const metric = metrics.register.getSingleMetric(name);
    const { values } = await metric!.get();
    return values
      .filter(
        entry =>
          ((entry as { metricName?: string }).metricName ?? name) === sample &&
          Object.entries(labels).every(([label, expected]) => entry.labels[label] === expected),
      )
      .reduce((sum, entry) => sum + entry.value, 0);
  }

  /** Runs `fn` and returns how much each of the given counters grew meanwhile. */
  async function delta(
    names: Array<[name: string, labels?: Record<string, string>, sample?: string]>,
    fn: () => Promise<void>,
  ) {
    const read = () =>
      Promise.all(names.map(([name, labels, sample]) => value(name, labels, sample)));
    const before = await read();
    await fn();
    const after = await read();
    return after.map((count, index) => count - before[index]);
  }

  const requests = (source: string): [string, Record<string, string>] => [
    'api_schema_explorer_cache_requests_total',
    { source },
  ];
  const MB = 1024 * 1024;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('requests are counted by where the snapshot came from', async () => {
    const redis = createRedis();
    const cache = createCache(redis);
    const build = workflow(redis);

    const counts = await delta(
      ['memory', 'inflight', 'redis', 'build', 'none'].map(requests),
      async () => {
        await cache.getOrBuild('version-1', () => build('version-1')); // build
        await cache.getOrBuild('version-1', () => build('version-1')); // memory
        await Promise.all([
          cache.getOrBuild('version-2', () => build('version-2')), // build
          cache.getOrBuild('version-2', () => build('version-2')), // inflight
        ]);
        await createCache(redis).getOrBuild('version-1', () => build('version-1')); // redis
        await cache.getOrBuild('version-3', async () => false); // none
      },
    );

    expect(counts).toEqual([1, 1, 1, 2, 1]);
  });

  test('evictions, the age of evicted entries and misses after an eviction are counted', async () => {
    vi.spyOn(SchemaExplorerSnapshotReader.prototype, 'estimatedMemoryBytes', 'get').mockReturnValue(
      100 * MB,
    );
    const redis = createRedis();
    const cache = createCache(redis, 256 * MB);
    const build = workflow(redis);

    const [evicted, ages, missesAfterEviction, fromRedis] = await delta(
      [
        ['api_schema_explorer_cache_evictions_total', { reason: 'evict' }],
        [
          'api_schema_explorer_cache_evicted_entry_age_seconds',
          {},
          'api_schema_explorer_cache_evicted_entry_age_seconds_count',
        ],
        ['api_schema_explorer_cache_misses_after_eviction_total'],
        requests('redis'),
      ],
      async () => {
        // 3 × 100 MB do not fit into 256 MB: the least recently used version-1 is evicted.
        for (const id of ['version-1', 'version-2', 'version-3']) {
          await cache.getOrBuild(id, () => build(id));
        }
        // A larger cache would have served this from memory.
        await cache.getOrBuild('version-1', () => build('version-1'));
      },
    );

    expect(evicted).toBe(2); // version-1, then version-2 to make room for version-1 again
    expect(ages).toBe(2);
    expect(missesAfterEviction).toBe(1);
    expect(fromRedis).toBe(1);
    expect(await value('api_schema_explorer_cache_entries')).toBe(2);
    expect(await value('api_schema_explorer_cache_memory_bytes')).toBe(200 * MB);
    expect(await value('api_schema_explorer_cache_memory_max_bytes')).toBe(256 * MB);
  });

  test('the memory limit comes from the config', async () => {
    vi.spyOn(SchemaExplorerSnapshotReader.prototype, 'estimatedMemoryBytes', 'get').mockReturnValue(
      100 * MB,
    );
    const redis = createRedis();
    const cache = createCache(redis, 150 * MB);
    const build = workflow(redis);

    const [evicted] = await delta(
      [['api_schema_explorer_cache_evictions_total', { reason: 'evict' }]],
      async () => {
        await cache.getOrBuild('version-1', () => build('version-1'));
        // 2 × 100 MB do not fit into 150 MB.
        await cache.getOrBuild('version-2', () => build('version-2'));
        await cache.getOrBuild('version-1', () => build('version-1'));
      },
    );

    expect(evicted).toBe(2);
    expect(await value('api_schema_explorer_cache_memory_max_bytes')).toBe(150 * MB);
  });

  test('a snapshot larger than the whole cache is counted and not kept', async () => {
    vi.spyOn(SchemaExplorerSnapshotReader.prototype, 'estimatedMemoryBytes', 'get').mockReturnValue(
      600 * MB,
    );
    const redis = createRedis();
    const cache = createCache(redis);
    const build = workflow(redis);

    const [tooLarge, fromMemory] = await delta(
      [['api_schema_explorer_cache_evictions_total', { reason: 'too_large' }], requests('memory')],
      async () => {
        await cache.getOrBuild('version-1', () => build('version-1'));
        await cache.getOrBuild('version-1', () => build('version-1'));
      },
    );

    expect(tooLarge).toBe(2);
    expect(fromMemory).toBe(0);
  });
});
