import { Inject, Injectable, Scope } from 'graphql-modules';
import { LRUCache } from 'lru-cache';
import * as Sentry from '@sentry/node';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';
import {
  SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION,
  SchemaExplorerSnapshotReader,
  type SchemaExplorerSnapshot,
} from '../lib/schema-explorer-snapshot';

/** Bounds the binary snapshots kept in memory (outside the JS heap) per API instance. */
const MEMORY_MAX_BYTES = 256 * 1024 * 1024;
/** A schema version never changes after it is written; the TTL only bounds Redis memory. */
const REDIS_TTL_SECONDS = 24 * 60 * 60;

/**
 * Caches the binary schema explorer snapshot per schema version: in memory (readers with their
 * parsed headers, up to `MEMORY_MAX_BYTES`) and in Redis (the raw bytes).
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
    const key = `schema-explorer-snapshot:v${SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION}:${schemaVersionId}`;

    const stored = await this.redis.getBuffer(key).catch(error => {
      // Not being able to read the cache must not fail the request; build the snapshot instead.
      Sentry.captureException(error, { extra: { schemaExplorerCacheKey: key } });
      return null;
    });
    let reader = stored ? SchemaExplorerSnapshotReader.fromBuffer(stored) : null;

    if (!reader) {
      const snapshot = await build();
      if (!snapshot) {
        return null;
      }
      reader = SchemaExplorerSnapshotReader.fromSnapshot(snapshot);
      await this.redis.setex(key, REDIS_TTL_SECONDS, reader.toBuffer()).catch(error => {
        Sentry.captureException(error, { extra: { schemaExplorerCacheKey: key } });
      });
    }

    this.memory.set(schemaVersionId, reader);
    return reader;
  }
}
