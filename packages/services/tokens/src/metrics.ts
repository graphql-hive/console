import type { LRUCache } from 'lru-cache';
import { metrics } from '@hive/service-common';

const tokenReads = new metrics.Counter({
  name: 'tokens_reads',
  help: 'Number of token reads',
  labelNames: ['status'],
});

const cacheReads = new metrics.Counter({
  name: 'tokens_cache_reads',
  help: 'Number of cache reads',
  labelNames: ['status'],
});

const cacheFills = new metrics.Counter({
  name: 'tokens_cache_fills',
  help: 'Number of cache fills',
  labelNames: ['source'],
});

export function recordCacheRead(status: NonNullable<LRUCache.Status<unknown>['fetch']>) {
  cacheReads.inc({ status });
}

export function recordCacheFill(source: 'db' | 'redis-fresh' | 'redis-stale') {
  cacheFills.inc({ source });
}

export function recordTokenRead(status: 200 | 500 | 404) {
  tokenReads.inc({ status });
}
