import { promisify } from 'node:util';
import { zstdCompress, zstdDecompress } from 'node:zlib';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { LRUCache } from 'lru-cache';
import * as Sentry from '@sentry/node';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';
import {
  SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION,
  SchemaExplorerSnapshotReader,
} from '../lib/schema-explorer-flat-snapshot';
import type { SchemaExplorerSnapshot } from '../lib/schema-explorer-snapshot';

/** Bounds the binary snapshots kept in memory (outside the JS heap) per API instance. */
const MEMORY_MAX_BYTES = 256 * 1024 * 1024;
/** A schema version never changes after it is written; the TTL only bounds Redis memory. */
const REDIS_TTL_SECONDS = 24 * 60 * 60;

// Run on libuv's thread pool, so neither blocks the event loop.
const compress = promisify(zstdCompress);
const decompress = promisify(zstdDecompress);

/**
 * Caches the binary schema explorer snapshot per schema version: in memory (readers over the
 * uncompressed bytes, up to `MEMORY_MAX_BYTES`) and in Redis (zstd-compressed, about 6× smaller,
 * which shrinks both Redis memory and the transfer on an instance's first request for a version).
 * Snapshots are immutable, so entries never need to be invalidated.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaExplorerCache {
  private memory = new LRUCache<string, SchemaExplorerSnapshotReader>({
    maxSize: MEMORY_MAX_BYTES,
    sizeCalculation: reader => Math.max(1, reader.byteLength),
  });
  /** Loads or builds in progress, so concurrent requests for a version share one. */
  private inflight = new Map<string, Promise<SchemaExplorerSnapshotReader | null>>();

  constructor(@Inject(REDIS_INSTANCE) private redis: Redis) {}

  getOrBuild(
    schemaVersionId: string,
    build: () => Promise<SchemaExplorerSnapshot | null>,
  ): Promise<SchemaExplorerSnapshotReader | null> {
    const inMemory = this.memory.get(schemaVersionId);
    if (inMemory) {
      return Promise.resolve(inMemory);
    }

    let pending = this.inflight.get(schemaVersionId);
    if (!pending) {
      pending = this.load(schemaVersionId, build).finally(() => {
        this.inflight.delete(schemaVersionId);
      });
      this.inflight.set(schemaVersionId, pending);
    }
    return pending;
  }

  private async load(
    schemaVersionId: string,
    build: () => Promise<SchemaExplorerSnapshot | null>,
  ): Promise<SchemaExplorerSnapshotReader | null> {
    const key = `schema-explorer-snapshot:v${SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION}:zstd:${schemaVersionId}`;

    const stored = await this.redis.getBuffer(key).catch(error => {
      // Not being able to read the cache must not fail the request; build the snapshot instead.
      Sentry.captureException(error, { extra: { schemaExplorerCacheKey: key } });
      return null;
    });
    let reader = stored ? await this.read(stored, key) : null;

    if (!reader) {
      const snapshot = await build();
      if (!snapshot) {
        return null;
      }
      reader = SchemaExplorerSnapshotReader.fromSnapshot(snapshot);
      await compress(reader.toBuffer())
        .then(compressed => this.redis.setex(key, REDIS_TTL_SECONDS, compressed))
        .catch(error => {
          Sentry.captureException(error, { extra: { schemaExplorerCacheKey: key } });
        });
    }

    this.memory.set(schemaVersionId, reader);
    return reader;
  }

  /** A stored value that cannot be decompressed or read is treated as missing, so it gets rebuilt. */
  private async read(stored: Buffer, key: string): Promise<SchemaExplorerSnapshotReader | null> {
    try {
      const reader = SchemaExplorerSnapshotReader.fromBuffer(await decompress(stored));
      if (!reader) {
        Sentry.captureMessage('Unreadable schema explorer snapshot in Redis', {
          extra: { schemaExplorerCacheKey: key },
        });
      }
      return reader;
    } catch (error) {
      Sentry.captureException(error, { extra: { schemaExplorerCacheKey: key } });
      return null;
    }
  }
}
