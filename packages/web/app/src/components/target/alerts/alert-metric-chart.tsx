import { useMemo } from 'react';
import * as echarts from 'echarts';
import type { MarkAreaComponentOption, MarkLineComponentOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FragmentType, graphql, useFragment } from '@/gql';
import { MetricAlertRuleMetric, MetricAlertRuleType } from '@/gql/graphql';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { useChartStyles } from '@/lib/utils';
import { ALERT_CHART_INSET_LEFT, ALERT_CHART_INSET_RIGHT } from './alert-chart-layout';
import { applyThresholdSign, windowAggregates } from './alert-threshold';

export const AlertMetricChart_OperationsStatsFragment = graphql(`
  fragment AlertMetricChart_OperationsStatsFragment on OperationsStats {
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
`);

type AlertMetricChartProps = {
  /** Masked operationsStats from the owner; null/undefined while it has no data yet. */
  stats: FragmentType<typeof AlertMetricChart_OperationsStatsFragment> | null | undefined;
  /** Whether the owner has a fetch in flight (distinguishes "Loading" from "No data"). */
  loading: boolean;
  type: MetricAlertRuleType;
  /** Sub-metric for LATENCY rules (P75/P90/...); null for ERROR_RATE / TRAFFIC */
  metric?: MetricAlertRuleMetric | null;
  /** Rule severity...tints the threshold marker line to match the severity badge. */
  severity?: string | null;
  /**
   * Threshold magnitude (always >= 0; the form edits a magnitude). For
   * FIXED_VALUE it's the level drawn as a horizontal marker line; for
   * PERCENTAGE_CHANGE it's the % the window-over-window delta is compared to.
   */
  thresholdValue: number | null;
  /** 'ABOVE' or 'BELOW' */
  direction: string;
  /** 'FIXED_VALUE' or 'PERCENTAGE_CHANGE' */
  thresholdType: string;
  /**
   * The rule's evaluation window in minutes. Used to split the fetched span
   * (~2 windows) into the previous | current windows the evaluator compares.
   */
  timeWindowMinutes: number;
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

const SEVERITY_COLOR_KEY: Record<string, 'critical' | 'warning' | 'info'> = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

// The preview fetch span is capped at 30 days (see `previewWindowMinutes` in
// alert-form.tsx), so for windows longer than 15 days the "previous" window
// falls outside the fetched data and can't be drawn or compared.
const PREVIEW_SPAN_CAP_MINUTES = 43_200;

const MS_PER_MINUTE = 60_000;

export function AlertMetricChart({
  stats,
  loading,
  type,
  metric,
  severity,
  thresholdValue,
  direction,
  thresholdType,
  timeWindowMinutes,
}: AlertMetricChartProps) {
  const { colors } = useChartStyles();

  const {
    requestsOverTime = [],
    failuresOverTime = [],
    durationOverTime = [],
  } = useFragment(AlertMetricChart_OperationsStatsFragment, stats ?? null) ?? {};
  const isLatency = type === MetricAlertRuleType.Latency;
  const isErrorRate = type === MetricAlertRuleType.ErrorRate;
  const latencyPercentile = isLatency && metric ? PERCENTILE_FIELD_BY_METRIC[metric] : null;

  const { data, yAxisFormatter, seriesName } = useMemo(() => {
    if (isLatency && latencyPercentile) {
      const key = latencyPercentile;
      return {
        data: durationOverTime.map<[string, number]>(node => [node.date, node.duration[key]]),
        yAxisFormatter: (value: number) => formatDuration(value, true),
        seriesName: key === 'avg' ? 'Avg latency' : `${key} latency`,
      };
    }

    if (isErrorRate) {
      return {
        data: requestsOverTime.map<[string, number]>((node, i) => {
          const failCount = failuresOverTime[i]?.value ?? 0;
          const rate = node.value > 0 ? (failCount / node.value) * 100 : 0;
          return [node.date, parseFloat(rate.toFixed(2))];
        }),
        yAxisFormatter: (value: number) => `${value}%`,
        seriesName: 'Error rate',
      };
    }

    // TRAFFIC
    return {
      data: requestsOverTime.map<[string, number]>(node => [node.date, node.value]),
      yAxisFormatter: formatNumber,
      seriesName: 'Total requests',
    };
  }, [
    requestsOverTime,
    failuresOverTime,
    durationOverTime,
    isLatency,
    latencyPercentile,
    isErrorRate,
  ]);

  if (data.length === 0) {
    return (
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 flex h-[200px] items-center justify-center rounded-md border">
        <span className={loading ? 'text-neutral-8 text-sm' : 'text-neutral-8 text-sm italic'}>
          {loading ? 'Loading chart data...' : 'No data available for this range.'}
        </span>
      </div>
    );
  }

  const severityColorKey = severity ? SEVERITY_COLOR_KEY[severity] : undefined;
  const markColor = severityColorKey ? colors[severityColorKey] : colors.primary;

  const isPercentageChange = thresholdType === 'PERCENTAGE_CHANGE';
  // Callers pass the stored value, which is signed for a % decrease (e.g. -50).
  // The chart only needs its magnitude — for the fixed-value level and to
  // rebuild the signed comparison consistently — so normalize once here.
  const thresholdMagnitude = thresholdValue != null ? Math.abs(thresholdValue) : null;

  const firstMs = new Date(data[0][0]).getTime();
  const lastMs = new Date(data[data.length - 1][0]).getTime();
  // The current window is the most recent `timeWindowMinutes` of the fetched
  // span; the previous window is the slice before it. Mirrors the evaluator's
  // split (its 1-minute offset is immaterial for an illustrative preview).
  const boundaryMs = lastMs - timeWindowMinutes * MS_PER_MINUTE;
  // The previous window is only present when the fetched span covers two full
  // windows (the form caps it at 30 days) and the boundary lands in the data.
  const hasPreviousWindow =
    timeWindowMinutes > 0 &&
    timeWindowMinutes * 2 <= PREVIEW_SPAN_CAP_MINUTES &&
    boundaryMs > firstMs;

  const { current: currentAgg, previous: previousAgg } = windowAggregates(
    type,
    latencyPercentile,
    requestsOverTime,
    failuresOverTime,
    durationOverTime,
    boundaryMs,
  );

  // Aggregates come from averaging / ratio math, so they can be long floats
  // (e.g. a 433.3333…ms mean). `formatDuration` only rounds values >= 1s, so
  // round before formatting: whole ms for latency, one decimal for the
  // error-rate %. Counts pass straight through `formatNumber`.
  const formatAggregate = (value: number) =>
    yAxisFormatter(
      isLatency ? Math.round(value) : isErrorRate ? Math.round(value * 10) / 10 : value,
    );

  // The window-over-window % change the rule evaluates. Null when there's no
  // previous baseline (a 0 -> n jump is an infinite change we don't plot).
  const deltaPercent =
    hasPreviousWindow && previousAgg !== 0
      ? ((currentAgg - previousAgg) / previousAgg) * 100
      : null;

  const signedThreshold =
    thresholdMagnitude != null
      ? applyThresholdSign(thresholdMagnitude, thresholdType, direction)
      : null;
  const deltaBreaches =
    isPercentageChange && deltaPercent != null && signedThreshold != null
      ? direction === 'ABOVE'
        ? deltaPercent > signedThreshold
        : deltaPercent < signedThreshold
      : false;

  const showWindowSplit = isPercentageChange && hasPreviousWindow;
  const displayData =
    isPercentageChange || timeWindowMinutes <= 0 || boundaryMs <= firstMs
      ? data
      : data.filter(([date]) => new Date(date).getTime() >= boundaryMs);

  const markLineData: NonNullable<MarkLineComponentOption['data']> = [];

  // Dotted divider + faint shade on the previous window so the current window
  // reads as the focus (% change only).
  if (showWindowSplit) {
    markLineData.push({
      xAxis: boundaryMs,
      lineStyle: { color: colors.gridSubtle, type: 'dotted', width: 1 },
      label: { show: false },
    });
  }
  const markArea: MarkAreaComponentOption | undefined = showWindowSplit
    ? {
        silent: true,
        itemStyle: { color: colors.gridSubtle, opacity: 0.18 },
        data: [[{ xAxis: firstMs }, { xAxis: boundaryMs }]],
      }
    : undefined;

  if (!isPercentageChange && thresholdMagnitude != null) {
    markLineData.push(
      // Threshold level (dashed, severity-tinted)...
      {
        yAxis: thresholdMagnitude,
        label: {
          formatter: `${direction === 'ABOVE' ? '>' : '<'} ${yAxisFormatter(thresholdMagnitude)}`,
          position: 'insideEndTop',
          color: markColor,
          fontSize: 11,
        },
        lineStyle: { color: markColor, type: 'dashed', width: 1 },
      },
      // ...and the current-window aggregate the rule actually compares to it, so
      // the user sees the evaluated number rather than only the per-bucket line.
      {
        yAxis: currentAgg,
        label: {
          formatter: `current ${formatAggregate(currentAgg)}`,
          position: 'insideEndBottom',
          color: colors.primary,
          fontSize: 11,
        },
        lineStyle: { color: colors.primary, type: 'solid', width: 1 },
      },
    );
  }

  if (isPercentageChange && hasPreviousWindow) {
    // Each window's aggregate as a short horizontal segment, so the comparison
    // the rule makes (previous level vs current level) is visible. Tinted by
    // severity when the delta breaches the threshold.
    const segColor = deltaBreaches ? markColor : colors.primary;
    const segLine = { color: segColor, type: 'solid' as const, width: 2 };
    markLineData.push(
      [
        { coord: [firstMs, previousAgg], symbol: 'none', lineStyle: segLine },
        { coord: [boundaryMs, previousAgg], symbol: 'none' },
      ],
      [
        { coord: [boundaryMs, currentAgg], symbol: 'none', lineStyle: segLine },
        { coord: [lastMs, currentAgg], symbol: 'none' },
      ],
    );
  }

  const markLine: MarkLineComponentOption | undefined = markLineData.length
    ? { symbol: 'none', silent: true, data: markLineData }
    : undefined;

  const range =
    new Date(displayData[displayData.length - 1][0]).getTime() -
    new Date(displayData[0][0]).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const timeFormatter = new Intl.DateTimeFormat(
    'en-US',
    range < dayMs ? { hour: 'numeric', minute: '2-digit' } : { month: 'long', day: 'numeric' },
  );

  const axisLabel = { fontSize: 11, color: colors.axisLabel };

  const chart = (
    <AutoSizer disableHeight>
      {size => (
        <ReactECharts
          style={{ width: size.width, height: 200 }}
          option={{
            backgroundColor: 'transparent',
            // Fixed insets (not `containLabel`) so the status-transitions bar can
            // mirror the exact plot region.
            grid: {
              left: ALERT_CHART_INSET_LEFT,
              top: 16,
              right: ALERT_CHART_INSET_RIGHT,
              bottom: 24,
              containLabel: false,
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
                data: displayData,
                markLine,
                markArea,
              },
            ],
          }}
        />
      )}
    </AutoSizer>
  );

  if (!isPercentageChange) {
    return chart;
  }

  return (
    <div className="space-y-1.5">
      <div className="text-neutral-10 flex flex-wrap items-center gap-x-2 text-[13px]">
        {hasPreviousWindow ? (
          <>
            <span>
              Previous {seriesName.toLowerCase()}: {formatAggregate(previousAgg)}
            </span>
            <span>→ current: {formatAggregate(currentAgg)}</span>
            <span className="font-medium" style={deltaBreaches ? { color: markColor } : undefined}>
              Δ{' '}
              {deltaPercent == null
                ? '—'
                : `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`}
            </span>
            {isLatency ? <span className="italic">(latency Δ is approximate)</span> : null}
          </>
        ) : (
          <span className="italic">No previous window in this range to compare.</span>
        )}
      </div>
      {chart}
    </div>
  );
}
