import { type ReactNode } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Card } from '@/components/base/card/card';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { formatRpm } from '@/lib/hooks/use-formatted-throughput';
import { useChartTheme } from './chart-theme';
import { mapValues, week } from './preview-data';
import { TimeSeriesChart } from './time-series-chart';

export const nav: NavPath = 'Base/Charts/TimeSeriesChart';

const REQUESTS = week(12000);
const FAILURES = week(150, 3);
const P75 = week(180, 5);

function ChartCard(props: { title: string; description: string; children: ReactNode }) {
  return (
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title={props.title}
      description={props.description}
    >
      {props.children}
    </Card>
  );
}

/** Operations over time: two filled series, Failures readable under Requests. */
export const Area = createPreview(() => {
  function Operations() {
    const { colors } = useChartTheme();
    return (
      <TimeSeriesChart
        kind="area"
        legend
        valueFormatter={formatNumber}
        series={[
          { name: 'Requests', data: REQUESTS, color: colors.primary },
          { name: 'Failures', data: FAILURES, color: colors.error },
        ]}
      />
    );
  }
  return (
    <div className="w-[48rem]">
      <ChartCard title="Operations over time" description="Timeline of GraphQL requests and failures">
        <Operations />
      </ChartCard>
    </div>
  );
});

/** Latency over time: four percentile lines, each in its own chart color. */
export const Lines = createPreview(() => {
  function Latency() {
    const { colors } = useChartTheme();
    return (
      <TimeSeriesChart
        kind="line"
        legend
        valueFormatter={value => formatDuration(value, true)}
        series={[
          { name: 'p75', data: P75, color: colors.p75 },
          { name: 'p90', data: mapValues(P75, v => Math.round(v * 1.4)), color: colors.p90 },
          { name: 'p95', data: mapValues(P75, v => Math.round(v * 1.9)), color: colors.p95 },
          { name: 'p99', data: mapValues(P75, v => Math.round(v * 3.2)), color: colors.p99 },
        ]}
      />
    );
  }
  return (
    <div className="w-[48rem]">
      <ChartCard title="Latency over time" description="Timeline of latency of GraphQL requests">
        <Latency />
      </ChartCard>
    </div>
  );
});

/** RPM over time: one bar per bucket, no legend since there is only one series. */
export const Bars = createPreview(() => (
  <div className="w-[48rem]">
    <ChartCard title="RPM over time" description="Requests per minute">
      <TimeSeriesChart
        kind="bar"
        valueFormatter={formatRpm}
        series={[{ name: 'RPM', data: mapValues(REQUESTS, v => +(v / 60).toFixed(4)) }]}
      />
    </ChartCard>
  </div>
));

/** The traces status breakdown: parts of each bucket's total stacked on one another. */
export const StackedBars = createPreview(() => {
  function Traces() {
    const { colors } = useChartTheme();
    return (
      <TimeSeriesChart
        kind="bar"
        stacked
        height={150}
        valueFormatter={formatNumber}
        series={[
          { name: 'Ok', data: mapValues(REQUESTS, v => Math.round(v * 0.6)), color: colors.primary },
          { name: 'Error', data: FAILURES, color: colors.error },
          {
            name: 'Filtered out',
            data: mapValues(REQUESTS, v => Math.round(v * 0.4)),
            color: 'rgba(170,175,180,0.1)',
          },
        ]}
      />
    );
  }
  return (
    <div className="w-[48rem]">
      <Traces />
    </div>
  );
});

/** One series, no legend: the Activity charts on the coordinate and client insights pages. */
export const SingleArea = createPreview(() => (
  <div className="w-[48rem]">
    <ChartCard title="Activity" description="GraphQL requests with Query.user over time">
      <TimeSeriesChart
        kind="area"
        valueFormatter={formatNumber}
        series={[{ name: 'Requests', data: REQUESTS }]}
      />
    </ChartCard>
  </div>
));
