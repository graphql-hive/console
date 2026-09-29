import { useMemo } from 'react';
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';
import { createAdaptiveTimeFormatter } from '@/lib/date-time';
import { useChartStyles } from '@/lib/utils';

export type LegendPosition = 'top' | 'bottom';

/** `formatNumber` returns small counts as numbers, so both are accepted. */
export type ValueFormatter = (value: number) => string | number;

type ChartColors = ReturnType<typeof useChartStyles>['colors'];

// Room for one legend row plus its gap to the plot or the axis labels.
const LEGEND_SPACE = 32;

function buildChartTheme(colors: ChartColors) {
  const axisLabel = { fontSize: 11, color: colors.axisLabel };
  const hiddenAxisLine = { axisLine: { show: false }, axisTick: { show: false } };

  return {
    colors,
    axisLabel,

    grid(legend?: LegendPosition | false): GridComponentOption {
      return {
        left: 0,
        right: 8,
        top: legend === 'top' ? LEGEND_SPACE : 16,
        bottom: legend === 'bottom' ? LEGEND_SPACE : 0,
        containLabel: true,
      };
    },

    legend(position: LegendPosition): LegendComponentOption {
      return {
        [position]: 0,
        left: 'center',
        icon: 'roundRect',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 16,
        textStyle: { fontSize: 11, color: colors.axisLabel },
      };
    },

    tooltip(valueFormatter?: ValueFormatter): TooltipComponentOption {
      return {
        trigger: 'axis',
        backgroundColor: colors.overlayBg,
        borderColor: colors.overlayBorder,
        textStyle: { color: colors.overlayText, fontSize: 12 },
        valueFormatter: valueFormatter as TooltipComponentOption['valueFormatter'],
      };
    },

    /** Labels adapt to the span, from times of day to months, and drop out rather than overlap. */
    timeAxis(from?: string, to?: string): XAXisComponentOption {
      return {
        type: 'time',
        ...hiddenAxisLine,
        splitLine: { show: false },
        axisLabel: {
          ...axisLabel,
          hideOverlap: true,
          formatter: createAdaptiveTimeFormatter(from, to),
        },
      };
    },

    valueAxis(formatter?: ValueFormatter): YAXisComponentOption {
      return {
        type: 'value',
        min: 0,
        ...hiddenAxisLine,
        splitLine: { lineStyle: { color: colors.gridSubtle } },
        axisLabel: {
          ...axisLabel,
          formatter: formatter ? (value: number) => String(formatter(value)) : undefined,
        },
      };
    },
  };
}

export type ChartTheme = ReturnType<typeof buildChartTheme>;

/** The shared look: quiet 11px labels, no axis lines, subtle solid grid, overlay tooltips. */
export function useChartTheme(): ChartTheme {
  const { colors } = useChartStyles();
  return useMemo(() => buildChartTheme(colors), [colors]);
}
