import { useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { Chart } from './chart';
import { useChartTheme } from './chart-theme';

type SparklineProps = {
  name: string;
  /** `[ISO date, value]` pairs, oldest first. */
  data: [string, number][];
  /** Shared across a row of sparklines so their heights compare. */
  max: number;
  /** Off while the data is a placeholder, so the real data is what animates in. */
  animation?: boolean;
  height?: number;
};

/** A bare trend line with no axes, for a card that shows activity at a glance. */
export function Sparkline({ name, data, max, animation = true, height = 90 }: SparklineProps) {
  const theme = useChartTheme();
  const { colors } = theme;

  const option = useMemo(
    (): EChartsOption => ({
      animation,
      grid: { left: 0, top: 10, right: 0, bottom: 10 },
      tooltip: theme.tooltip(formatNumber),
      xAxis: { type: 'time', show: false },
      yAxis: { type: 'value', show: false, min: 0, max },
      series: [
        {
          name,
          type: 'line',
          color: colors.primary,
          lineStyle: { width: 2 },
          showSymbol: false,
          areaStyle: {
            opacity: 0.8,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colors.primaryAreaFrom },
              { offset: 1, color: colors.primaryAreaTo },
            ]),
          },
          emphasis: { focus: 'series' },
          data,
        },
      ],
    }),
    [name, data, max, animation, theme, colors],
  );

  return <Chart option={option} height={height} />;
}
