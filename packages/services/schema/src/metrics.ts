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

export const compositionTotalDurationMS = new metrics.Histogram({
  name: 'composition_total_duration_ms',
  help: 'Total time of processing a composition (includes time in queue + actual processing time)',
});

export const compositionQueueDurationMS = new metrics.Histogram({
  name: 'composition_queue_duration_ms',
  help: 'Time spent in queue before being processed.',
});

export const compositionWorkerDurationMS = new metrics.Histogram({
  name: 'composition_worker_duration_ms',
  help: 'Time of running composition in worker',
  labelNames: ['type' /* single, federation or stitching */],
});

export const compositionCacheValueSizeBytes = new metrics.Histogram({
  name: 'composition_cache_value_size_bytes',
  help: 'The size of the cache entries.',
});
