import { useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { Chart } from '@/components/ui/primitives/chart/chart';
import { useChartTheme } from '@/components/ui/primitives/chart/chart-theme';
import type { TimeSeries } from '@/components/ui/primitives/chart/time-series-chart';
import { formatNumber } from '@/lib/hooks/use-formatted-number';

/**
 * Delivery attempts per interval as a neutral area, like the metric chart on the alert rule page,
 * with the failed attempts as a line over it.
 */
export function ChannelDeliveriesChart({
  deliveries,
  errors,
}: {
  deliveries: TimeSeries['data'];
  errors: TimeSeries['data'];
}) {
  const theme = useChartTheme();

  const option = useMemo((): EChartsOption => {
    const { colors } = theme;
    const line = {
      type: 'line' as const,
      smooth: false,
      showSymbol: false,
      emphasis: { disabled: true },
    };
    return {
      grid: theme.grid(true),
      legend: theme.legend(),
      tooltip: theme.tooltip(formatNumber),
      xAxis: theme.timeAxis(deliveries[0]?.[0], deliveries[deliveries.length - 1]?.[0]),
      yAxis: theme.valueAxis(formatNumber),
      series: [
        {
          ...line,
          name: 'Total calls',
          lineStyle: { color: colors.line, width: 1.5 },
          itemStyle: { color: colors.line },
          areaStyle: {
            opacity: 1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0.146, color: colors.areaFillFrom },
              { offset: 0.963, color: colors.areaFillTo },
            ]),
          },
          data: deliveries,
        },
        {
          ...line,
          name: 'Errors',
          lineStyle: { color: colors.error, width: 1.5 },
          itemStyle: { color: colors.error },
          data: errors,
        },
      ],
    };
  }, [theme, deliveries, errors]);

  return <Chart option={option} height={200} />;
}
