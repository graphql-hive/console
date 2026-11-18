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

// Enabled rules/query-groups split by whether they filter (the heavier
// legacy-table path). Tracks how much of that expensive population exists.
export const metricAlertEnabledRules = new metrics.Gauge({
  name: 'hive_metric_alert_enabled_rules',
  help: 'Enabled metric alert rules, by whether a saved filter is attached',
  labelNames: ['filtered'],
});
export const metricAlertRuleGroups = new metrics.Gauge({
  name: 'hive_metric_alert_rule_groups',
  help: 'Metric alert query groups (one ClickHouse query each), by whether a saved filter is attached',
  labelNames: ['filtered'],
});

// The hourly sweep that disables alert channels failing for 48 hours: its candidate scan over
// the per-channel state rollup and the per-candidate check against outbound_deliveries, split
// by `query` so the Metric-Alerts dashboard shows what an hour costs. Same buckets as the
// evaluator's histogram above, so the two are comparable.
export const alertChannelSweepClickHouseQueryDuration = new metrics.Histogram({
  name: 'hive_alert_channel_sweep_clickhouse_query_duration_seconds',
  help: 'Duration of the ClickHouse queries of the hourly sweep that disables alert channels failing for 48 hours',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  labelNames: ['query', 'outcome'],
});

export const alertChannelsAutoDisabledCounter = new metrics.Counter({
  name: 'hive_alert_channels_auto_disabled_total',
  help: 'Alert channels Hive disabled after they had been failing for 48 hours',
});
