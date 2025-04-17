import { metrics } from '@hive/service-common';

export const composeAndValidateCounter = new metrics.Counter({
  name: 'schema_compose_and_validate_total',
  help: 'Number of calls to compose and validate schemas',
  labelNames: ['type'],
});

export const schemaCompositionCounter = new metrics.Counter({
  name: 'schema_composition_total',
  help: 'Number of schema compositions',
  labelNames: ['cache' /* hit or miss */, 'type' /* success, failure or timeout */],
});

const msBuckets = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_000, 3_000, 4_000, 5_000, 7_000, 10_000];

export const compositionTotalDurationMS = new metrics.Histogram({
  name: 'composition_total_duration_ms',
  help: 'Total time of processing a composition (includes time in queue + actual processing time)',
  buckets: msBuckets,
});

export const compositionQueueDurationMS = new metrics.Histogram({
  name: 'composition_queue_duration_ms',
  help: 'Time spent in queue before being processed.',
  buckets: msBuckets,
});

export const compositionWorkerDurationMS = new metrics.Histogram({
  name: 'composition_worker_duration_ms',
  help: 'Time of running composition in worker',
  labelNames: ['type' /* single, federation or stitching */],
  buckets: msBuckets,
});

export const compositionCacheValueSizeBytes = new metrics.Histogram({
  name: 'composition_cache_value_size_bytes',
  help: 'The size of the cache entries.',
  buckets: [
    50, 100, 250, 500, 1_000, 2_000, 3_000, 4_000, 5_000, 7_000, 10_000, 12_000, 15_000, 17_000,
    20_000,
  ],
});
