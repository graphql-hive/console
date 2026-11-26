import { Inject, Injectable, Scope } from 'graphql-modules';
import { LRUCache } from 'lru-cache';
import {
  readSchemaExplorerSnapshot,
  schemaExplorerSnapshotKey,
  type SchemaExplorerSnapshotReader,
} from '@hive/schema-explorer-snapshot';
import { invariant, metrics } from '@hive/service-common';
import * as Sentry from '@sentry/node';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';

/**
 * A miss for a version this instance evicted within this window counts as a miss after eviction:
 * a larger in-memory cache would have served it.
 */
const RECENTLY_EVICTED_WINDOW_MS = 60 * 60 * 1000;

const requests = new metrics.Counter({
  name: 'api_schema_explorer_cache_requests_total',
  help: 'Schema explorer snapshot requests by where the snapshot came from.',
  // memory: cached reader; inflight: joined a load already in progress; redis: loaded from Redis;
  // build: built from the schema; none: the version has no schema to build from.
  labelNames: ['source'],
});
const loadDuration = new metrics.Histogram({
  name: 'api_schema_explorer_cache_load_duration_seconds',
  help: 'Time to load a schema explorer snapshot that was not in memory.',
  labelNames: ['source' /* redis, build, none */],
  buckets: [0.005, 0.025, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});
const evictions = new metrics.Counter({
  name: 'api_schema_explorer_cache_evictions_total',
  help: 'Schema explorer snapshots dropped from memory.',
  // evict: removed to stay within the size limit; too_large: larger than the whole cache, never kept.
  labelNames: ['reason'],
});
const evictedEntryAge = new metrics.Histogram({
  name: 'api_schema_explorer_cache_evicted_entry_age_seconds',
  help: 'How long a schema explorer snapshot was in memory before it was evicted.',
  buckets: [10, 60, 300, 900, 1_800, 3_600, 4 * 3_600, 12 * 3_600, 24 * 3_600],
});
const missesAfterEviction = new metrics.Counter({
  name: 'api_schema_explorer_cache_misses_after_eviction_total',
  help: 'Misses for a schema version this instance evicted within the last hour; a larger cache would have served them.',
});
const entryBytes = new metrics.Histogram({
  name: 'api_schema_explorer_cache_entry_bytes',
  help: 'Estimated memory of each schema explorer snapshot put into the cache.',
  buckets: [
    64 * 1024,
    256 * 1024,
    1024 ** 2,
    4 * 1024 ** 2,
    16 * 1024 ** 2,
    64 * 1024 ** 2,
    256 * 1024 ** 2,
    512 * 1024 ** 2,
  ],
});
const memoryBytes = new metrics.Gauge({
  name: 'api_schema_explorer_cache_memory_bytes',
  help: 'Estimated memory of the schema explorer snapshots kept in memory.',
});
const memoryMaxBytes = new metrics.Gauge({
  name: 'api_schema_explorer_cache_memory_max_bytes',
  help: 'Size limit of the in-memory schema explorer snapshot cache.',
});
const entries = new metrics.Gauge({
  name: 'api_schema_explorer_cache_entries',
  help: 'Number of schema explorer snapshots kept in memory.',
});

@Injectable()
export class SchemaExplorerCacheConfig {
  constructor(
    public readonly config: {
      /** Estimated memory of the snapshots kept in memory per API instance, in bytes. */
      memoryMaxBytes: number;
      /** How long a request waits for the workflows service to build a missing snapshot. */
      buildTimeoutMs: number;
    },
  ) {}
}

/**
 * Caches the binary schema explorer snapshot per schema version: in memory (readers over the
 * uncompressed bytes, up to `memoryMaxBytes` of their estimated memory, see
 * `SCHEMA_EXPLORER_CACHE_MEMORY_MAX_MB`) and in Redis (zstd-compressed, about 6× smaller, which
 * shrinks both Redis memory and the transfer on an instance's first request for a version).
 * Snapshots are immutable, so entries never need to be invalidated. Missing snapshots are built
 * by the workflows service (see `SchemaExplorerSnapshotBuilder`).
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaExplorerCache {
  private memoryMaxBytes: number;
  private memory: LRUCache<string, SchemaExplorerSnapshotReader>;
  /** When each version in `memory` was put there, for the age of evicted entries. */
  private cachedAt = new Map<string, number>();
  /** Versions evicted within `RECENTLY_EVICTED_WINDOW_MS`, to spot misses a larger cache avoids. */
  private recentlyEvicted = new LRUCache<string, true>({
    max: 10_000,
    ttl: RECENTLY_EVICTED_WINDOW_MS,
  });
  /** Loads or builds in progress, so concurrent requests for a version share one. */
  private inflight = new Map<string, Promise<SchemaExplorerSnapshotReader | null>>();

  constructor(
    @Inject(REDIS_INSTANCE) private redis: Redis,
    { config }: SchemaExplorerCacheConfig,
  ) {
    this.memoryMaxBytes = config.memoryMaxBytes;
    memoryMaxBytes.set(this.memoryMaxBytes);
    this.memory = new LRUCache<string, SchemaExplorerSnapshotReader>({
      maxSize: this.memoryMaxBytes,
      sizeCalculation: reader => Math.max(1, reader.estimatedMemoryBytes),
      dispose: (_reader, schemaVersionId, reason) => {
        const cachedAt = this.cachedAt.get(schemaVersionId);
        this.cachedAt.delete(schemaVersionId);
        if (reason === 'evict') {
          evictions.inc({ reason: 'evict' });
          if (cachedAt !== undefined) {
            evictedEntryAge.observe((Date.now() - cachedAt) / 1000);
          }
          this.recentlyEvicted.set(schemaVersionId, true);
        }
      },
    });
  }

  /**
   * `build` has the snapshot built and stored in Redis (see `SchemaExplorerSnapshotBuilder`); it
   * resolves `false` if the version has no schema.
   */
  getOrBuild(
    schemaVersionId: string,
    build: () => Promise<boolean>,
  ): Promise<SchemaExplorerSnapshotReader | null> {
    const inMemory = this.memory.get(schemaVersionId);
    if (inMemory) {
      requests.inc({ source: 'memory' });
      return Promise.resolve(inMemory);
    }

    let pending = this.inflight.get(schemaVersionId);
    if (pending) {
      requests.inc({ source: 'inflight' });
    } else {
      if (this.recentlyEvicted.delete(schemaVersionId)) {
        missesAfterEviction.inc();
      }
      pending = this.load(schemaVersionId, build).finally(() => {
        this.inflight.delete(schemaVersionId);
      });
      this.inflight.set(schemaVersionId, pending);
    }
    return pending;
  }

  private async load(
    schemaVersionId: string,
    build: () => Promise<boolean>,
  ): Promise<SchemaExplorerSnapshotReader | null> {
    const startedAt = performance.now();
    const done = (source: 'redis' | 'build' | 'none') => {
      requests.inc({ source });
      loadDuration.observe({ source }, (performance.now() - startedAt) / 1000);
    };

    let reader = await this.read(schemaVersionId);
    let source: 'redis' | 'build' = 'redis';

    if (!reader) {
      source = 'build';
      if (!(await build())) {
        done('none');
        return null;
      }
      reader = await this.read(schemaVersionId);
      invariant(reader, 'The built schema explorer snapshot could not be read from Redis.');
    }

    done(source);
    this.remember(schemaVersionId, reader);
    return reader;
  }

  private remember(schemaVersionId: string, reader: SchemaExplorerSnapshotReader) {
    const bytes = reader.estimatedMemoryBytes;
    entryBytes.observe(bytes);
    if (bytes > this.memoryMaxBytes) {
      // LRUCache would not keep it either; every request for this version is a miss.
      evictions.inc({ reason: 'too_large' });
      return;
    }
    this.cachedAt.set(schemaVersionId, Date.now());
    this.memory.set(schemaVersionId, reader);
    memoryBytes.set(this.memory.calculatedSize);
    entries.set(this.memory.size);
  }

  /**
   * The snapshot stored in Redis, or null. A value that cannot be fetched, decompressed or read
   * counts as missing, so it gets rebuilt.
   */
  private async read(schemaVersionId: string): Promise<SchemaExplorerSnapshotReader | null> {
    try {
      return await readSchemaExplorerSnapshot(this.redis, schemaVersionId);
    } catch (error) {
      Sentry.captureException(error, {
        extra: { schemaExplorerCacheKey: schemaExplorerSnapshotKey(schemaVersionId) },
      });
      return null;
    }
  }
}
