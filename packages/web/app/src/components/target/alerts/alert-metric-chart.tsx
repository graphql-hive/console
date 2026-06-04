import { useMemo } from 'react';
import { subMinutes } from 'date-fns';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import { graphql } from '@/gql';
import { MetricAlertRuleMetric, MetricAlertRuleType } from '@/gql/graphql';
import { resolveRangeAndResolution } from '@/lib/hooks/use-date-range-controller';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { useTickCounter } from '@/lib/hooks/use-tick-counter';
import { useChartStyles } from '@/lib/utils';

const AlertMetricChart_Query = graphql(`
  query AlertMetricChart(
    $targetSelector: TargetSelectorInput!
    $period: DateRangeInput!
    $resolution: Int!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      operationsStats(period: $period) {
        requestsOverTime(resolution: $resolution) {
          date
          value
        }
        failuresOverTime(resolution: $resolution) {
          date
          value
        }
        durationOverTime(resolution: $resolution) {
          date
          duration {
            avg
            p75
            p90
            p95
            p99
          }
        }
      }
    }
  }
`);

type AlertMetricChartProps = {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  type: MetricAlertRuleType;
  /** Sub-metric for LATENCY rules (P75/P90/...); null for ERROR_RATE / TRAFFIC */
  metric?: MetricAlertRuleMetric | null;
  /** Time window in minutes */
  timeWindowMinutes: number;
  /** Threshold value to show as a horizontal marker line (only drawn for FIXED_VALUE rules) */
  thresholdValue: number | null;
  /** 'ABOVE' or 'BELOW' */
  direction: string;
  /** 'FIXED_VALUE' or 'PERCENTAGE_CHANGE' */
  thresholdType: string;
};

// Maps the GraphQL enum to the lowercase field names on DurationValues
// (`p99`, `p95`, ...). Exhaustive Record so adding a new MetricAlertRuleMetric
// fails the build until the mapping is updated.
const PERCENTILE_FIELD_BY_METRIC: Record<
  MetricAlertRuleMetric,
  'avg' | 'p75' | 'p90' | 'p95' | 'p99'
> = {
  [MetricAlertRuleMetric.Avg]: 'avg',
  [MetricAlertRuleMetric.P75]: 'p75',
  [MetricAlertRuleMetric.P90]: 'p90',
  [MetricAlertRuleMetric.P95]: 'p95',
  [MetricAlertRuleMetric.P99]: 'p99',
};

export function AlertMetricChart({
  organizationSlug,
  projectSlug,
  targetSlug,
  type,
  metric,
  timeWindowMinutes,
  thresholdValue,
  direction,
  thresholdType,
}: AlertMetricChartProps) {
  const { colors } = useChartStyles();

  // Advance the rolling window every 15s so the metric line chart picks
  // up new ClickHouse data as the workflows evaluator drives transitions.
  // Including `tick` in the useMemo deps recomputes `period` with a fresh
  // `now`, which changes the variables, which causes urql to refire.
  const tick = useTickCounter(15_000);
  const { resolution, period } = useMemo(() => {
    const now = new Date();
    const from = subMinutes(now, timeWindowMinutes);
    const resolved = resolveRangeAndResolution({ from, to: now });
    return {
      resolution: resolved.resolution,
      period: {
        from: resolved.range.from.toISOString(),
        to: resolved.range.to.toISOString(),
      },
    };
  }, [timeWindowMinutes, tick]);

  const [result] = useQuery({
    query: AlertMetricChart_Query,
    variables: {
      targetSelector: { organizationSlug, projectSlug, targetSlug },
      period,
      resolution,
    },
  });

  const stats = result.data?.target?.operationsStats;
  const isLatency = type === MetricAlertRuleType.Latency;
  const isErrorRate = type === MetricAlertRuleType.ErrorRate;
  const latencyPercentile = isLatency && metric ? PERCENTILE_FIELD_BY_METRIC[metric] : null;

  const { data, yAxisFormatter, seriesName } = useMemo(() => {
    if (!stats) return { data: [], yAxisFormatter: formatNumber, seriesName: '' };

    if (isLatency && latencyPercentile) {
      const key = latencyPercentile;
      return {
        data: (stats.durationOverTime ?? []).map<[string, number]>(node => [
          node.date,
          node.duration[key],
        ]),
        yAxisFormatter: (value: number) => formatDuration(value, true),
        seriesName: key === 'avg' ? 'Avg latency' : `${key} latency`,
      };
    }

    if (isErrorRate) {
      const requests = stats.requestsOverTime ?? [];
      const failures = stats.failuresOverTime ?? [];
      return {
        data: requests.map<[string, number]>((node, i) => {
          const failCount = failures[i]?.value ?? 0;
          const rate = node.value > 0 ? (failCount / node.value) * 100 : 0;
          return [node.date, parseFloat(rate.toFixed(2))];
        }),
        yAxisFormatter: (value: number) => `${value}%`,
        seriesName: 'Error rate',
      };
    }

    // TRAFFIC
    return {
      data: (stats.requestsOverTime ?? []).map<[string, number]>(node => [node.date, node.value]),
      yAxisFormatter: formatNumber,
      seriesName: 'Total requests',
    };
  }, [stats, isLatency, latencyPercentile, isErrorRate]);

  if (result.fetching && data.length === 0) {
    return (
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 flex h-[200px] items-center justify-center rounded-md border">
        <span className="text-neutral-8 text-sm">Loading chart data...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 flex h-[200px] items-center justify-center rounded-md border">
        <span className="text-neutral-8 text-sm italic">No data available for this range.</span>
      </div>
    );
  }

  const markLine =
    thresholdValue != null && thresholdType === 'FIXED_VALUE'
      ? {
          symbol: 'none',
          silent: true,
          data: [
            {
              yAxis: thresholdValue,
              label: {
                formatter: `${direction === 'ABOVE' ? '>' : '<'} ${yAxisFormatter(thresholdValue)}`,
                position: 'insideEndTop' as const,
                color: colors.primary,
                fontSize: 11,
              },
            },
          ],
          lineStyle: {
            color: colors.primary,
            type: 'dashed' as const,
            width: 1,
          },
        }
      : undefined;

  const range = new Date(data[data.length - 1][0]).getTime() - new Date(data[0][0]).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const timeFormatter = new Intl.DateTimeFormat(
    'en-US',
    range < dayMs ? { hour: 'numeric', minute: '2-digit' } : { month: 'long', day: 'numeric' },
  );

  const axisLabel = { fontSize: 11, color: colors.axisLabel };

  return (
    <AutoSizer disableHeight>
      {size => (
        <ReactECharts
          style={{ width: size.width, height: 200 }}
          option={{
            backgroundColor: 'transparent',
            grid: {
              left: 10,
              top: 16,
              right: 10,
              bottom: 4,
              containLabel: true,
            },
            tooltip: {
              trigger: 'axis',
              backgroundColor: colors.overlayBg,
              borderColor: colors.overlayBorder,
              textStyle: { color: colors.overlayText, fontSize: 12 },
              // Reuse the y-axis formatter so the hovered value carries its unit
              // (e.g. "1.86s" for latency, "2%" for error rate) instead of a
              // bare number like "1,862".
              valueFormatter: (value: number) => yAxisFormatter(value),
            },
            xAxis: [
              {
                type: 'time',
                boundaryGap: false,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: {
                  ...axisLabel,
                  // Drop labels that would otherwise overlap. Without this,
                  // narrow ranges (e.g. 30m) cram every bucket's tick label
                  // edge-to-edge ("6:42 PM6:44 PM..."). echarts still picks
                  // a sensible subset on its own once we opt in.
                  hideOverlap: true,
                  formatter: (value: number) => timeFormatter.format(value),
                },
              },
            ],
            yAxis: [
              {
                type: 'value',
                min: 0,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: {
                  lineStyle: { color: colors.gridSubtle },
                },
                axisLabel: {
                  ...axisLabel,
                  formatter: (value: number) => yAxisFormatter(value),
                },
              },
            ],
            series: [
              {
                name: seriesName,
                type: 'line',
                smooth: false,
                showSymbol: false,
                lineStyle: { color: colors.line, width: 1.5 },
                itemStyle: { color: colors.line },
                areaStyle: {
                  opacity: 1,
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0.146, color: colors.areaFillFrom },
                    { offset: 0.963, color: colors.areaFillTo },
                  ]),
                },
                emphasis: { disabled: true },
                large: true,
                data,
                markLine,
              },
            ],
          }}
        />
      )}
    </AutoSizer>
  );
}
