import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { MetricAlertRuleSeverity, MetricAlertRuleState } from '@/gql/graphql';
import { useChartStyles } from '@/lib/utils';

type ActivityEvent = {
  toState: MetricAlertRuleState;
  createdAt: string;
  rule: { severity: MetricAlertRuleSeverity };
};

type ChartProps = {
  events: ReadonlyArray<ActivityEvent>;
  /** ISO start of the chart range. */
  from: string;
  /** ISO end of the chart range. */
  to: string;
};

const SEVERITY_ORDER: MetricAlertRuleSeverity[] = [
  MetricAlertRuleSeverity.Critical,
  MetricAlertRuleSeverity.Warning,
  MetricAlertRuleSeverity.Info,
];

const SEVERITY_LABEL: Record<MetricAlertRuleSeverity, string> = {
  [MetricAlertRuleSeverity.Critical]: 'Critical',
  [MetricAlertRuleSeverity.Warning]: 'Warning',
  [MetricAlertRuleSeverity.Info]: 'Info',
};

/** Pick a bucket size (in ms) that gives ~30–60 buckets across the range. */
function pickBucketMs(rangeMs: number): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (rangeMs <= 1 * hour) return 1 * minute;
  if (rangeMs <= 6 * hour) return 5 * minute;
  if (rangeMs <= 24 * hour) return 30 * minute;
  if (rangeMs <= 7 * day) return 6 * hour;
  return 1 * day;
}

export function AlertActivityChart({ events, from, to }: ChartProps) {
  const { colors } = useChartStyles();

  const { buckets, bucketStartMs, bucketMs } = useMemo(() => {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const rangeMs = Math.max(toMs - fromMs, 60 * 1000);
    const bucketMs = pickBucketMs(rangeMs);

    const startMs = Math.floor(fromMs / bucketMs) * bucketMs;
    const endMs = Math.ceil(toMs / bucketMs) * bucketMs;
    const bucketCount = Math.max(1, Math.round((endMs - startMs) / bucketMs));

    // Per severity, an array of counts indexed by bucket.
    const buckets: Record<MetricAlertRuleSeverity, number[]> = {
      [MetricAlertRuleSeverity.Critical]: new Array(bucketCount).fill(0),
      [MetricAlertRuleSeverity.Warning]: new Array(bucketCount).fill(0),
      [MetricAlertRuleSeverity.Info]: new Array(bucketCount).fill(0),
    };

    for (const e of events) {
      // Only count firings — the chart answers "when did things break?"
      if (e.toState !== MetricAlertRuleState.Firing) continue;
      const t = new Date(e.createdAt).getTime();
      if (t < startMs || t >= endMs) continue;
      const idx = Math.floor((t - startMs) / bucketMs);
      const sev = e.rule.severity;
      if (buckets[sev]) buckets[sev][idx]++;
    }

    return { buckets, bucketStartMs: startMs, bucketMs };
  }, [events, from, to]);

  const totalEvents = useMemo(
    () => SEVERITY_ORDER.reduce((sum, sev) => sum + buckets[sev].reduce((a, b) => a + b, 0), 0),
    [buckets],
  );

  const xAxisData = useMemo(
    () => buckets[MetricAlertRuleSeverity.Critical].map((_, i) => bucketStartMs + i * bucketMs),
    [buckets, bucketStartMs, bucketMs],
  );

  const range = new Date(to).getTime() - new Date(from).getTime();
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  // Pick a label format that suits the bucket size + range. A multi-day range
  // with sub-day buckets needs both date AND time so adjacent ticks aren't
  // identical ("Apr 22 / Apr 22 / Apr 22").
  const formatterOptions: Intl.DateTimeFormatOptions =
    bucketMs >= dayMs
      ? { month: 'short', day: 'numeric' }
      : range > dayMs
        ? { month: 'short', day: 'numeric', hour: 'numeric' }
        : { hour: 'numeric', minute: '2-digit' };
  const timeFormatter = new Intl.DateTimeFormat('en-US', formatterOptions);

  // Always show date + time in the tooltip — bucket timestamps need to be
  // unambiguous when hovering, even if the x-axis only shows the date.
  const tooltipTimeFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // Aim for ~7 visible x-axis labels regardless of bucket count.
  const targetLabelCount = 7;
  const labelInterval = Math.max(0, Math.ceil(xAxisData.length / targetLabelCount) - 1);

  const axisLabel = { fontSize: 11, color: colors.axisLabel };

  const SEVERITY_COLOR: Record<MetricAlertRuleSeverity, string> = {
    [MetricAlertRuleSeverity.Critical]: colors.critical,
    [MetricAlertRuleSeverity.Warning]: colors.warning,
    [MetricAlertRuleSeverity.Info]: colors.info,
  };

  if (totalEvents === 0) {
    return (
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 flex h-[200px] items-center justify-center rounded-md border">
        <span className="text-neutral-8 text-sm italic">
          No alerts fired in the selected time range.
        </span>
      </div>
    );
  }

  return (
    <AutoSizer disableHeight>
      {size => (
        <ReactECharts
          style={{ width: size.width, height: 200 }}
          option={{
            backgroundColor: 'transparent',
            grid: { left: 10, top: 16, right: 10, bottom: 4, containLabel: true },
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              backgroundColor: colors.overlayBg,
              borderColor: colors.overlayBorder,
              textStyle: { color: colors.overlayText, fontSize: 12 },
              formatter: (
                params: Array<{
                  seriesName: string;
                  value: number;
                  color: string;
                  axisValue: string | number;
                }>,
              ) => {
                const total = params.reduce((sum, p) => sum + (p.value || 0), 0);
                if (total === 0) return '';
                const bucketStart = Number(params[0]?.axisValue);
                const bucketEnd = bucketStart + bucketMs;
                const header = `<div style="margin-bottom:4px;color:${colors.overlayText};opacity:0.7;font-size:11px;">${tooltipTimeFormatter.format(bucketStart)} – ${tooltipTimeFormatter.format(bucketEnd)}</div>`;
                const lines = params
                  .filter(p => p.value > 0)
                  .map(
                    p =>
                      `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${p.value}`,
                  );
                return header + lines.join('<br/>');
              },
            },
            xAxis: {
              type: 'category',
              data: xAxisData,
              axisLine: { show: false },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: {
                ...axisLabel,
                interval: labelInterval,
                formatter: (value: string) => timeFormatter.format(Number(value)),
              },
            },
            yAxis: {
              type: 'value',
              min: 0,
              minInterval: 1,
              axisLine: { show: false },
              axisTick: { show: false },
              splitLine: { lineStyle: { color: colors.gridSubtle } },
              axisLabel: { ...axisLabel, formatter: (value: number) => String(value) },
            },
            series: SEVERITY_ORDER.map(sev => ({
              name: SEVERITY_LABEL[sev],
              type: 'bar',
              stack: 'severity',
              barMaxWidth: 24,
              itemStyle: { color: SEVERITY_COLOR[sev], borderRadius: [2, 2, 0, 0] },
              emphasis: { disabled: true },
              data: buckets[sev],
            })),
          }}
        />
      )}
    </AutoSizer>
  );
}
