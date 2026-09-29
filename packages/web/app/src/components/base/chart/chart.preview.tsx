import type { EChartsOption } from 'echarts';
import { createPreview, type NavPath } from 'react-foundry';
import { Card } from '@/components/base/card/card';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { useChartTheme, type LegendPosition } from './chart-theme';
import { Chart } from './chart';

export const nav: NavPath = 'Base/Charts/Chart';

const HOUR = 60 * 60 * 1000;
const END = Date.UTC(2026, 8, 29, 12);

/** A week of hourly buckets with a daily rhythm, fixed so the preview looks the same on every load. */
function week(peak: number, phase = 0): [string, number][] {
  return Array.from({ length: 7 * 24 }, (_, i) => {
    const time = END - (7 * 24 - 1 - i) * HOUR;
    const daily = (Math.sin(((i + phase) / 24) * Math.PI * 2) + 1) / 2;
    const wobble = (Math.sin(i * 1.7) + 1) / 8;
    return [new Date(time).toISOString(), Math.round(peak * (0.2 + 0.6 * daily + wobble))];
  });
}

const REQUESTS = week(4200);
const FAILURES = week(260, 3);

function RequestsAndFailures(props: { legend?: LegendPosition }) {
  const theme = useChartTheme();
  const option: EChartsOption = {
    grid: theme.grid(props.legend),
    legend: props.legend ? theme.legend(props.legend) : { show: false },
    tooltip: theme.tooltip(formatNumber),
    xAxis: theme.timeAxis(REQUESTS[0][0], REQUESTS[REQUESTS.length - 1][0]),
    yAxis: theme.valueAxis(formatNumber),
    series: [
      {
        type: 'line',
        name: 'Requests',
        showSymbol: false,
        color: theme.colors.primary,
        areaStyle: {},
        emphasis: { focus: 'series' },
        data: REQUESTS,
      },
      {
        type: 'line',
        name: 'Failures',
        showSymbol: false,
        color: theme.colors.error,
        areaStyle: {},
        emphasis: { focus: 'series' },
        data: FAILURES,
      },
    ],
  };
  return <Chart option={option} height={200} />;
}

/** The shared look on a raised card, the way Insights mounts it. Hover for the overlay tooltip. */
export const Default = createPreview(() => (
  <div className="w-[48rem]">
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title="Operations over time"
      description="Timeline of GraphQL requests and failures"
    >
      <RequestsAndFailures />
    </Card>
  </div>
));

/**
 * The legend is ECharts' own, so clicking an entry hides its series and hovering highlights it.
 * Its row is reserved in the grid either way, so it never lands on the axis labels.
 */
export const LegendPlacement = createPreview(() => (
  <div className="flex w-[48rem] flex-col gap-6">
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title="Legend on top"
      description="Timeline of GraphQL requests and failures"
    >
      <RequestsAndFailures legend="top" />
    </Card>
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title="Legend at the bottom"
      description="Timeline of GraphQL requests and failures"
    >
      <RequestsAndFailures legend="bottom" />
    </Card>
  </div>
));
