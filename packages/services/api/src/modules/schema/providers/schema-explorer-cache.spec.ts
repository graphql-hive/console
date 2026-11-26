import { zstdDecompressSync } from 'node:zlib';
import Redis from 'ioredis-mock';
import 'reflect-metadata';
import { metrics } from '@hive/service-common';
import type { Logger } from '../../shared/providers/logger';
import { Mutex, MutexResourceLockedError } from '../../shared/providers/mutex';
import {
  SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION,
  SchemaExplorerSnapshotReader,
} from '../lib/schema-explorer-flat-snapshot';
import { buildSchemaExplorerSnapshotBuffer } from '../worker/schema-explorer-snapshot-worker';
import { SchemaExplorerCache, SchemaExplorerCacheConfig } from './schema-explorer-cache';

let port = 1000;
/** ioredis-mock shares data between clients created with the same port. */
function createRedis() {
  return new Redis(port++);
}

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  debug: vi.fn(),
  child: () => logger,
} as unknown as Logger;

/**
 * A cache like one API instance's: the default 512 MB memory limit and a real lock on the given
 * (mock) Redis, unless given.
 */
function createCache(
  redis: unknown,
  memoryMaxBytes = 512 * 1024 * 1024,
  lock: unknown = new Mutex(logger, redis as any),
) {
  return new SchemaExplorerCache(
    redis as any,
    new SchemaExplorerCacheConfig({ memoryMaxBytes }),
    lock as any,
  );
}

function snapshotBuilder() {
  const build = vi.fn(async () =>
    buildSchemaExplorerSnapshotBuffer({
      compositeSdl: `type Query { hello(name: String = "you"): String }`,
      supergraphSdl: null,
    }),
  );
  return build;
}

const key = (id: string) =>
  `schema-explorer-snapshot:v${SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION}:zstd:${id}`;

/** The stored value, decompressed. */
async function storedSnapshot(redis: InstanceType<typeof Redis>, id: string) {
  const stored = await redis.getBuffer(key(id));
  return stored ? zstdDecompressSync(stored) : null;
}

test('builds on a miss, stores the binary snapshot in Redis and serves later reads from memory', async () => {
  const redis = createRedis();
  const cache = createCache(redis);
  const build = snapshotBuilder();

  const first = await cache.getOrBuild('version-1', build);
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

  expect(await cache.getOrBuild('version-1', build)).toBe(first);
  expect(build).toHaveBeenCalledTimes(1);
});

test('another instance (empty memory) reads the snapshot from Redis instead of building it', async () => {
  const redis = createRedis();
  const build = snapshotBuilder();
  await createCache(redis).getOrBuild('version-1', build);

  const otherInstance = createCache(redis);
  const reader = await otherInstance.getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
});

test('concurrent requests for a version share one build', async () => {
  const cache = createCache(createRedis());
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

  const reader = await createCache(redis).getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
  expect((await storedSnapshot(redis, 'version-1'))?.toString('latin1', 0, 3)).toBe('HSE');
});

test('an uncompressed snapshot in Redis is rebuilt', async () => {
  const redis = createRedis();
  const build = snapshotBuilder();
  const uncompressed = (await build())!;
  await redis.set(key('version-1'), uncompressed);

  const reader = await createCache(redis).getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(2);
  expect((await storedSnapshot(redis, 'version-1'))?.equals(uncompressed)).toBe(true);
});

test('versions without a schema are not cached', async () => {
  const redis = createRedis();
  const cache = createCache(redis);
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
  const failingLock = {
    lock: vi.fn(async () => {
      throw new Error('connection lost');
    }),
  };
  const cache = createCache(failingRedis, undefined, failingLock);
  const build = snapshotBuilder();

  const reader = await cache.getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(failingRedis.setex).toHaveBeenCalledTimes(1);
  // Served from memory afterwards.
  await cache.getOrBuild('version-1', build);
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

    const counts = await delta(
      ['memory', 'inflight', 'redis', 'build', 'none'].map(requests),
      async () => {
        await cache.getOrBuild('version-1', snapshotBuilder()); // build
        await cache.getOrBuild('version-1', snapshotBuilder()); // memory
        await Promise.all([
          cache.getOrBuild('version-2', snapshotBuilder()), // build
          cache.getOrBuild('version-2', snapshotBuilder()), // inflight
        ]);
        await createCache(redis).getOrBuild('version-1', snapshotBuilder()); // redis
        await cache.getOrBuild('version-3', async () => null); // none
      },
    );

    expect(counts).toEqual([1, 1, 1, 2, 1]);
  });

  test('evictions, the age of evicted entries and misses after an eviction are counted', async () => {
    vi.spyOn(SchemaExplorerSnapshotReader.prototype, 'estimatedMemoryBytes', 'get').mockReturnValue(
      100 * MB,
    );
    const cache = createCache(createRedis(), 256 * MB);

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
          await cache.getOrBuild(id, snapshotBuilder());
        }
        // A larger cache would have served this from memory.
        await cache.getOrBuild('version-1', snapshotBuilder());
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
    const cache = createCache(createRedis(), 150 * MB);
    const build = snapshotBuilder();

    const [evicted] = await delta(
      [['api_schema_explorer_cache_evictions_total', { reason: 'evict' }]],
      async () => {
        await cache.getOrBuild('version-1', build);
        // 2 × 100 MB do not fit into 150 MB.
        await cache.getOrBuild('version-2', build);
        await cache.getOrBuild('version-1', build);
      },
    );

    expect(evicted).toBe(2);
    expect(await value('api_schema_explorer_cache_memory_max_bytes')).toBe(150 * MB);
  });

  test('a snapshot larger than the whole cache is counted and not kept', async () => {
    vi.spyOn(SchemaExplorerSnapshotReader.prototype, 'estimatedMemoryBytes', 'get').mockReturnValue(
      600 * MB,
    );
    const cache = createCache(createRedis());

    const [tooLarge, fromMemory] = await delta(
      [['api_schema_explorer_cache_evictions_total', { reason: 'too_large' }], requests('memory')],
      async () => {
        await cache.getOrBuild('version-1', snapshotBuilder());
        await cache.getOrBuild('version-1', snapshotBuilder());
      },
    );

    expect(tooLarge).toBe(2);
    expect(fromMemory).toBe(0);
  });

  test("an instance that waited for another instance's build counts it as a Redis load", async () => {
    const redis = createRedis();
    const instances = [createCache(redis), createCache(redis), createCache(redis)];
    const slowBuild = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return buildSchemaExplorerSnapshotBuffer({
        compositeSdl: `type Query { hello: String }`,
        supergraphSdl: null,
      });
    };

    const [built, fromRedis] = await delta([requests('build'), requests('redis')], async () => {
      await Promise.all(instances.map(cache => cache.getOrBuild('version-1', slowBuild)));
    });

    expect(built).toBe(1);
    expect(fromRedis).toBe(2);
  });
});

test('only one instance builds a missing snapshot; the others read it from Redis', async () => {
  const redis = createRedis();
  const instances = [createCache(redis), createCache(redis), createCache(redis)];
  let builds = 0;
  const slowBuild = async () => {
    builds++;
    await new Promise(resolve => setTimeout(resolve, 300));
    return buildSchemaExplorerSnapshotBuffer({
      compositeSdl: `type Query { hello: String }`,
      supergraphSdl: null,
    });
  };

  const readers = await Promise.all(
    instances.map(cache => cache.getOrBuild('version-1', slowBuild)),
  );

  expect(builds).toBe(1);
  expect(readers.map(reader => reader?.queryTypeName)).toEqual(['Query', 'Query', 'Query']);
});

test('an instance builds the snapshot itself when it cannot get the lock', async () => {
  const redis = createRedis();
  const busyLock = {
    lock: vi.fn(async () => {
      throw new MutexResourceLockedError('Resource is locked.');
    }),
  };
  const cache = createCache(redis, undefined, busyLock);
  const build = snapshotBuilder();

  const reader = await cache.getOrBuild('version-1', build);

  expect(reader?.queryTypeName).toBe('Query');
  expect(build).toHaveBeenCalledTimes(1);
  expect((await storedSnapshot(redis, 'version-1'))?.toString('latin1', 0, 3)).toBe('HSE');
});
