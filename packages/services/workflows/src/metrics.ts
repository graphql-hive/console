import { metrics } from '@hive/service-common';

export const jobCompleteCounter = new metrics.Counter({
  name: 'hive_workflow_job_complete_total',
  help: 'Total number of completed jobs',
  labelNames: ['task_identifier'],
});

export const jobErrorCounter = new metrics.Counter({
  name: 'hive_workflow_job_error_total',
  help: 'Total number of jobs with errors',
  labelNames: ['task_identifier'],
});

export const jobSuccessCounter = new metrics.Counter({
  name: 'hive_workflow_job_success_total',
  help: 'Total number of successful jobs',
  labelNames: ['task_identifier'],
});

export const jobFailedCounter = new metrics.Counter({
  name: 'hive_workflow_job_failed_total',
  help: 'Total number of failed jobs',
  labelNames: ['task_identifier'],
});

export const workerFatalErrorCounter = new metrics.Counter({
  name: 'hive_workflow_worker_fatal_error_total',
  help: 'Total number of worker fatal errors',
});

export const jobDuration = new metrics.Summary({
  name: 'hive_workflow_job_duration_seconds',
  help: 'Duration of jobs in seconds',
  labelNames: ['task_identifier'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
});

export const jobQueueTime = new metrics.Summary({
  name: 'hive_workflow_job_queue_time_seconds',
  help: 'Time a job spends in the queue in seconds',
  labelNames: ['task_identifier'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
});

// Tracks the round-trip duration of every ClickHouse query the metric alert
// evaluator runs. The cron fires once per minute and issues one query per
// `(targetId, timeWindowMinutes, savedFilterId)` group, so query count scales
// with rule count. Used by the Metric-Alerts dashboard + alert rules to flag
// degraded ClickHouse latency or error rate before users notice stale alerts.
export const metricAlertClickHouseQueryDuration = new metrics.Histogram({
  name: 'hive_metric_alert_clickhouse_query_duration_seconds',
  help: 'Duration of ClickHouse queries issued by the metric alert evaluator',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  labelNames: ['outcome'],
});
