import { metrics } from '@hive/service-common';

export const normalizeCacheMisses = new metrics.Counter({
  name: 'usage_ingestor_normalize_cache_misses',
  help: 'Number of cache misses when normalizing operations',
});

export const schemaCoordinatesSize = new metrics.Summary({
  name: 'usage_ingestor_schema_coordinates_size',
  help: 'Size of schema coordinates',
});

export const totalOperations = new metrics.Counter({
  name: 'usage_ingestor_operations_total',
  help: 'Number of raw operations received by usage ingestor service',
});

export const processDuration = new metrics.Histogram({
  name: 'usage_ingestor_process_duration_seconds',
  help: 'Time spent processing and writing reports',
});

export const writeDuration = new metrics.Histogram({
  name: 'usage_ingestor_write_duration_seconds',
  help: 'Time spent writing reports',
  labelNames: ['query', 'destination', 'status'],
});

export const errors = new metrics.Counter({
  name: 'usage_ingestor_errors',
  help: 'Number of errors occurred during processing and writing reports',
});

export const reportMessageBytes = new metrics.Summary({
  name: 'usage_ingestor_report_message_bytes',
  help: 'Size (in bytes) of a "usage_reports" topic message received by ingestor service',
});

export const reportSize = new metrics.Summary({
  name: 'usage_ingestor_report_size',
  help: 'Number of operations per report received by ingestor service',
});

export const reportMessageSize = new metrics.Summary({
  name: 'usage_ingestor_report_message_size',
  help: 'Number of reports in the "usage_reports" message received by ingestor service',
});

export const ingestedOperationsWrites = new metrics.Counter({
  name: 'usage_ingested_operation_writes',
  help: 'Number of successfully ingested operations',
});

export const ingestedOperationErrorsWrites = new metrics.Counter({
  name: 'usage_ingested_operation_errors_writes',
  help: 'Number of successfully ingested operations_errors',
});

export const ingestedOperationsFailures = new metrics.Counter({
  name: 'usage_ingested_operation_failures',
  help: 'Rows in operations and subscription_operations insert attempts that failed; counts every attempt, so it rises with retries during an outage',
});

export const ingestedOperationRegistryWrites = new metrics.Counter({
  name: 'usage_ingested_operation_registry_writes',
  help: 'Number of successfully ingested registry records',
});

export const ingestedOperationRegistryFailures = new metrics.Counter({
  name: 'usage_ingested_operation_registry_failures',
  help: 'Rows in operation_collection insert attempts that failed; counts every attempt, so it rises with retries during an outage',
});

export const ingestedOperationErrorsFailures = new metrics.Counter({
  name: 'usage_ingested_operation_errors_failures',
  help: 'Rows in operation_errors insert attempts that failed; counts every attempt, so it rises with retries during an outage',
});

/**
 * An additional error tracking metric that should never be encountered
 * since the messages are both consumed and published by Hive, but
 * if a poison pill does ever occur, it should instantly alert the on call,
 * which is why it is a separate metric.
 */
export const poisonPillMessages = new metrics.Counter({
  name: 'usage_ingestor_poison_pill_messages',
  help: 'Number of messages that could not be decompressed or parsed and were dropped so the partition keeps flowing; the offset is committed and the payload is only in the debug log until a dead-letter queue exists',
});

export const failingMessages = new metrics.Gauge({
  name: 'usage_ingestor_failing_messages',
  help: 'Kafka messages with at least one ClickHouse insert that failed and is being retried in place; drops back when the insert succeeds or the ingestor shuts down. Sustained values mean a stuck message (the log carries its token, offset, HTTP status and ClickHouse error) or a ClickHouse outage',
});

export const committedOffsetLag = new metrics.Gauge({
  name: 'usage_ingestor_committed_offset_lag',
  help: 'Messages between the partition high watermark and the next offset to commit; grows when ClickHouse is not acknowledging writes or offset commits are failing',
  labelNames: ['partition'],
});
