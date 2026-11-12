import { useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, SeriesOption } from 'echarts';
import { Chart } from './chart';
import { useChartTheme, type ValueFormatter } from './chart-theme';

export type TimeSeries = {
  name: string;
  /** `[ISO date, value]` pairs, oldest first. */
  data: [string, number][];
  /** Concrete color from `useChartTheme().colors`; defaults to the primary chart color. */
  color?: string;
};

type TimeSeriesChartProps = {
  series: TimeSeries[];
  kind: 'line' | 'area' | 'bar';
  /** Stacks the series on one another, for parts of a whole. */
  stacked?: boolean;
  valueFormatter?: ValueFormatter;
  /** A key under the chart, for when there is more than one series. */
  legend?: boolean;
  height?: number;
  onRangeSelect?: (range: { from: Date; to: Date }) => void;
};

// Bars are centered on their bucket start, so a bucket is touched within half a step of it.
export function snapToBuckets(
  [start, end]: [number, number],
  times: number[],
): { from: Date; to: Date } | null {
  if (end <= start || times.length === 0) {
    return null;
  }
  const step = times.length > 1 ? times[1] - times[0] : 0;
  const touched = times.filter(time => time + step / 2 >= start && time - step / 2 <= end);
  if (touched.length === 0) {
    return null;
  }
  return { from: new Date(touched[0]), to: new Date(touched[touched.length - 1] + step) };
}

/** Values over time on a time axis: lines, filled areas or bars, one or several series. */
export function TimeSeriesChart({
  series,
  kind,
  stacked = false,
  valueFormatter,
  legend = false,
  height = 200,
  onRangeSelect,
}: TimeSeriesChartProps) {
  const theme = useChartTheme();
  const brushable = !!onRangeSelect;

  const option = useMemo((): EChartsOption => {
    const first = series[0]?.data;
    return {
      grid: theme.grid(legend),
      legend: legend ? theme.legend() : { show: false },
      tooltip: theme.tooltip(valueFormatter),
      xAxis: theme.timeAxis(first?.[0]?.[0], first?.[first.length - 1]?.[0]),
      yAxis: theme.valueAxis(valueFormatter),
      brush: brushable ? theme.brushX() : undefined,
      // The brush adds its own toolbox buttons; dragging works without them.
      toolbox: brushable ? { show: false } : undefined,
      series: series.map((entry): SeriesOption => {
        const color = entry.color ?? theme.colors.primary;
        const shared = {
          name: entry.name,
          color,
          stack: stacked ? 'total' : undefined,
          emphasis: { focus: 'series' as const },
          data: entry.data,
        };
        if (kind === 'bar') {
          return { ...shared, type: 'bar', large: true };
        }
        return {
          ...shared,
          type: 'line',
          showSymbol: false,
          // Fades toward the baseline, so a smaller series underneath stays readable.
          areaStyle:
            kind === 'area'
              ? {
                  opacity: 1,
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: echarts.color.modifyAlpha(color, 0.3) },
                    { offset: 1, color: echarts.color.modifyAlpha(color, 0) },
                  ]),
                }
              : undefined,
        };
      }),
    };
  }, [series, kind, stacked, valueFormatter, legend, theme, brushable]);

  const onEvents = useMemo(() => {
    if (!onRangeSelect) {
      return undefined;
    }
    const times = (series[0]?.data ?? []).map(([date]) => new Date(date).getTime());
    return {
      brushEnd(params: { areas?: Array<{ coordRange?: [number, number] }> }) {
        const coordRange = params.areas?.[0]?.coordRange;
        const range = coordRange && snapToBuckets(coordRange, times);
        if (range) {
          onRangeSelect(range);
        }
      },
    };
  }, [series, onRangeSelect]);

  return <Chart option={option} height={height} onEvents={onEvents} brushX={brushable} />;
}
