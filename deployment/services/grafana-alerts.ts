import { Folder, RuleGroup } from '@lbrlabs/pulumi-grafana';

/**
 * Provisions Grafana alert rules that target the Prometheus metrics exposed by
 * the metric-alert evaluator. Pairs with the Metric-Alerts dashboard at
 * `deployment/grafana-dashboards/Metric-Alerts.json`.
 *
 * Why these specific rules: the metric-alert evaluator runs every minute and
 * issues one ClickHouse query per `(target, timeWindow, savedFilter)` group.
 * Two failure modes will produce stale or missing user alerts before any user
 * notices, so we want to catch them automatically:
 *   1. ClickHouse latency degrades — queries take long enough that the cron
 *      misses ticks or hits its task timeout.
 *   2. ClickHouse query error rate climbs — partial outage means rules silently
 *      fail to evaluate.
 */
export function deployGrafanaAlerts(envName: string) {
  // Separate folder from dashboards keeps the alerts list scoped and makes it
  // clear what's machine-managed vs. operator-edited.
  const folder = new Folder('grafana-hive-alerts-folder', {
    title: `Hive Alerts (${envName})`,
  });

  // Single rule group for the metric-alerts feature; evaluation interval
  // matches the cron that produces the underlying metrics (every minute).
  // @ts-expect-error @lbrlabs/pulumi-grafana@0.1.0 marks orgId required on
  // RuleGroupArgs but optional on Folder/Dashboard; per the library docstring,
  // omitting it falls back to the provider's configured org (same as how the
  // Folder above and Dashboards in services/grafana.ts are set up).
  const ruleGroup = new RuleGroup('metric-alerts-evaluator', {
    folderUid: folder.uid,
    name: 'metric-alerts-evaluator',
    intervalSeconds: 60,
    rules: [
      {
        name: 'MetricAlertEvaluatorClickHouseSlow',
        for: '5m',
        condition: 'B',
        noDataState: 'OK',
        execErrState: 'Alerting',
        annotations: {
          summary: 'Metric-alert evaluator ClickHouse queries are slow',
          description:
            'p99 ClickHouse query duration in the metric alert evaluator has been > 5s for 5 minutes. The cron may miss ticks or alert state may be stale.',
          runbook_url:
            'https://github.com/graphql-hive/console/blob/main/packages/services/workflows/src/lib/metric-alert-evaluator.ts',
        },
        labels: { severity: 'warning', component: 'metric-alerts' },
        isPaused: false,
        datas: [
          {
            refId: 'A',
            queryType: '',
            relativeTimeRange: { from: 600, to: 0 },
            datasourceUid: 'grafanacloud-prom',
            model: JSON.stringify({
              refId: 'A',
              expr: 'histogram_quantile(0.99, sum by (le) (rate(hive_metric_alert_clickhouse_query_duration_seconds_bucket[5m])))',
              instant: false,
              range: true,
              intervalMs: 30_000,
              maxDataPoints: 43_200,
            }),
          },
          {
            refId: 'B',
            queryType: '',
            relativeTimeRange: { from: 0, to: 0 },
            datasourceUid: '__expr__',
            model: JSON.stringify({
              refId: 'B',
              type: 'threshold',
              expression: 'A',
              conditions: [
                {
                  type: 'query',
                  evaluator: { type: 'gt', params: [5] },
                  operator: { type: 'and' },
                  query: { params: ['A'] },
                  reducer: { type: 'last', params: [] },
                },
              ],
              datasource: { type: '__expr__', uid: '__expr__' },
            }),
          },
        ],
      },
      {
        name: 'MetricAlertEvaluatorClickHouseErrors',
        for: '5m',
        condition: 'B',
        noDataState: 'OK',
        execErrState: 'Alerting',
        annotations: {
          summary: 'Metric-alert evaluator ClickHouse error rate is high',
          description:
            'More than 5% of ClickHouse queries from the metric alert evaluator have errored over the last 5 minutes. Some rules are not evaluating; user alert state is stale.',
          runbook_url:
            'https://github.com/graphql-hive/console/blob/main/packages/services/workflows/src/lib/metric-alert-evaluator.ts',
        },
        labels: { severity: 'critical', component: 'metric-alerts' },
        isPaused: false,
        datas: [
          {
            refId: 'A',
            queryType: '',
            relativeTimeRange: { from: 600, to: 0 },
            datasourceUid: 'grafanacloud-prom',
            model: JSON.stringify({
              refId: 'A',
              // Error ratio: errored queries / total queries. clamp_min on the
              // denominator avoids divide-by-zero when there's no traffic at all.
              expr: 'sum(rate(hive_metric_alert_clickhouse_query_duration_seconds_count{outcome="error"}[5m])) / clamp_min(sum(rate(hive_metric_alert_clickhouse_query_duration_seconds_count[5m])), 0.001)',
              instant: false,
              range: true,
              intervalMs: 30_000,
              maxDataPoints: 43_200,
            }),
          },
          {
            refId: 'B',
            queryType: '',
            relativeTimeRange: { from: 0, to: 0 },
            datasourceUid: '__expr__',
            model: JSON.stringify({
              refId: 'B',
              type: 'threshold',
              expression: 'A',
              conditions: [
                {
                  type: 'query',
                  evaluator: { type: 'gt', params: [0.05] },
                  operator: { type: 'and' },
                  query: { params: ['A'] },
                  reducer: { type: 'last', params: [] },
                },
              ],
              datasource: { type: '__expr__', uid: '__expr__' },
            }),
          },
        ],
      },
    ],
  });

  return { folder, ruleGroup };
}
