import { type ReactElement, type ReactNode } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { createPreview, type NavPath } from 'react-foundry';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Bar, BarChart, XAxis } from 'recharts';
import {
  CollectedOperationsOverTime,
  CollectedOperationsOverTime_OperationFragment,
} from '@/components/admin/admin-stats';
import { Card } from '@/components/base/card/card';
import { ResourceCard } from '@/components/common/resource-card';
import { AlertActivityChart } from '@/components/target/alerts/alert-activity-chart';
import {
  AlertMetricChart,
  AlertMetricChart_OperationsStatsFragment,
} from '@/components/target/alerts/alert-metric-chart';
import {
  LatencyOverTimeStats,
  LatencyOverTimeStats_OperationStatsFragment,
  OverTimeStats,
  OverTimeStats_OperationsStatsFragment,
  RpmOverTimeStats,
  RpmOverTimeStats_OperationStatsFragment,
} from '@/components/target/insights/stats';
import { resolutionToMilliseconds } from '@/components/target/insights/utils';
import { CallSite, CallSiteGroup, InventoryList } from '@/components/inventory/shared';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { makeFragmentData } from '@/gql';
import {
  MetricAlertRuleMetric,
  MetricAlertRuleSeverity,
  MetricAlertRuleState,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { formatRpm } from '@/lib/hooks/use-formatted-throughput';
import { stringToHiveColor, useChartStyles } from '@/lib/utils';
import { Chart } from './chart';
import { useChartTheme } from './chart-theme';
import { mapValues, week } from './preview-data';
import { Sparkline } from './sparkline';
import { TimeSeriesChart } from './time-series-chart';

export const nav: NavPath = 'Base/Charts/Component Examples';

/**
 * Every chart in the app, drawn as it ships today (Before) above its replacement on the base
 * charts (After), fed the same mock data. Components that mount without the app are the real
 * thing; the rest are transcribed from their source line by line, because their page runs its own
 * query or reads route params the preview router cannot provide.
 */

const ENTRIES = [
  {
    source: 'components/target/insights/stats.tsx:267',
    origin: 'raw',
    what: 'Operations over time: requests and failures as filled areas, with a legend',
    coveredBy: 'Insights',
  },
  {
    source: 'components/target/insights/stats.tsx:840',
    origin: 'raw',
    what: 'Latency over time: p75, p90, p95, p99 lines, with a legend',
    coveredBy: 'Insights',
  },
  {
    source: 'components/target/insights/stats.tsx:942',
    origin: 'raw',
    what: 'RPM over time: one bar per bucket (and a one-item legend)',
    coveredBy: 'Insights',
  },
  {
    source: 'components/target/insights/stats.tsx:574',
    origin: 'raw',
    what: 'Clients: top five clients as horizontal % bars, the labels link to the client page',
    coveredBy: 'Clients',
  },
  {
    source: 'components/target/insights/stats.tsx:621',
    origin: 'raw',
    what: 'Clients: top five client versions as horizontal % bars',
    coveredBy: 'Clients',
  },
  {
    source: 'components/target/insights/stats.tsx:676',
    origin: 'raw',
    what: 'Clients: every client and version as a treemap, behind "Display all versions"',
    coveredBy: 'Clients',
  },
  {
    source: 'pages/target-insights-coordinate.tsx:333',
    origin: 'raw',
    what: 'Coordinate Activity: requests as one filled area',
    coveredBy: 'Coordinate and client',
  },
  {
    source: 'pages/target-insights-coordinate.tsx:396',
    origin: 'raw',
    what: 'Coordinate resolutions and errors: two filled areas, no legend',
    coveredBy: 'Coordinate and client',
  },
  {
    source: 'pages/target-insights-coordinate.tsx:603',
    origin: 'raw',
    what: 'Coordinate Error Activity: one bar series per error code, no legend',
    coveredBy: 'Coordinate and client',
  },
  {
    source: 'pages/target-insights-client.tsx:170',
    origin: 'raw',
    what: 'Client Activity: requests as one filled area',
    coveredBy: 'Coordinate and client',
  },
  {
    source: 'components/admin/admin-stats.tsx:64',
    origin: 'raw',
    what: 'Admin: collected operations as one smoothed area, with a one-item legend',
    coveredBy: 'Admin and subscription',
  },
  {
    source: 'pages/organization-subscription.tsx:171',
    origin: 'raw',
    what: 'Historical Usage: monthly events as bars, 400px tall',
    coveredBy: 'Admin and subscription',
  },
  {
    source: 'pages/target-alerts-detail.tsx:355',
    origin: 'raw',
    what: 'Alert rule detail: the metric with threshold and window marks (already the target look)',
    coveredBy: 'Alerts',
  },
  {
    source: 'components/target/alerts/alert-form.tsx:847',
    origin: 'raw',
    what: 'Alert form preview: the same chart, clipped to the current window',
    coveredBy: 'Alerts',
  },
  {
    source: 'pages/target-alerts-activity.tsx:228',
    origin: 'raw',
    what: 'Alert activity: firings per bucket, stacked by severity (already the target look)',
    coveredBy: 'Alerts',
  },
  {
    source: 'components/organization/project-card.tsx:32',
    origin: 'raw',
    what: 'Project cards: the requests sparkline, on one scale across the cards',
    coveredBy: 'Cards',
  },
  {
    source: 'pages/project.tsx:40',
    origin: 'raw',
    what: 'Target cards: the same ResourceCard sparkline',
    coveredBy: 'Cards',
  },
  {
    source: 'pages/target-traces.tsx:148',
    origin: 'raw',
    what: 'Traces: status per bucket as stacked bars (Recharts), with drag-to-select a range',
    coveredBy: 'Traces',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/chart"
      summary={
        <>
          Sixteen charts at eighteen mounts: fifteen ECharts option objects written out by hand, the
          one Recharts chart on the traces page, and the alert metric chart and ResourceCard mounted
          twice each. Three looks today: Insights (dashed grid, default tooltip, canvas legend),
          Alerts (the target), and the card sparkline.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// Mock data, shaped like each query returns it.

const REQUESTS = week(12000);
const FAILURES = week(150, 3);
const P75 = week(180, 5);
const FROM = REQUESTS[0][0];
const TO = new Date(new Date(REQUESTS[REQUESTS.length - 1][0]).getTime() + 60 * 60 * 1000)
  .toISOString();
const PERIOD = { from: FROM, to: TO };
const RESOLUTION = REQUESTS.length;

const points = <T extends 'RequestsOverTime' | 'FailuresOverTime'>(
  series: [string, number][],
  __typename: T,
) => series.map(([date, value]) => ({ __typename, date, value }));

const DURATIONS = P75.map(([date, p75]) => ({
  __typename: 'DurationOverTime' as const,
  date,
  duration: {
    __typename: 'DurationValues' as const,
    avg: Math.round(p75 * 0.8),
    p75,
    p90: Math.round(p75 * 1.4),
    p95: Math.round(p75 * 1.9),
    p99: Math.round(p75 * 3.2),
  },
}));

const RPM = mapValues(REQUESTS, value =>
  parseFloat((value / (resolutionToMilliseconds(RESOLUTION, PERIOD) / (60 * 1000))).toFixed(4)),
);

/** The label/value pairs ClientsStats derives from the clients query, top five plus the rest. */
const BY_CLIENT = {
  labels: ['web-app', 'ios', 'android', 'graphql-codegen', 'Other clients (3)'],
  values: ['48.20', '21.35', '17.80', '7.15', '5.50'],
};
const BY_VERSION = {
  labels: ['web-app@4.12.0', 'ios@2.3.1', 'android@2.3.0', 'web-app@4.11.2', 'Other versions (9)'],
  values: ['39.10', '19.85', '16.20', '9.10', '15.75'],
};
const BY_CLIENT_AND_VERSION = [
  { name: 'web-app', path: 'web-app', value: 48200, versions: ['4.12.0', '4.11.2', '4.10.0'] },
  { name: 'ios', path: 'ios', value: 21350, versions: ['2.3.1', '2.2.0'] },
  { name: 'android', path: 'android', value: 17800, versions: ['2.3.0', '2.2.4'] },
  { name: 'graphql-codegen', path: 'graphql-codegen', value: 7150, versions: ['5.0.0'] },
].map(client => ({
  value: client.value,
  name: client.name,
  path: client.path,
  children: client.versions.map((version, i) => ({
    value: Math.round(client.value / (i + 1.5)),
    name: version,
    path: `${client.name}@${version}`,
  })),
}));

const ERROR_CODES: Record<string, [string, number][]> = {
  INTERNAL_SERVER_ERROR: week(40, 1),
  UNAUTHENTICATED: week(25, 2),
  BAD_USER_INPUT: week(10, 4),
};

const MONTHLY_USAGE: [string, number][] = Array.from({ length: 12 }, (_, i) => [
  new Date(Date.UTC(2025, 9 + i, 1)).toISOString(),
  Math.round(40_000_000 + 25_000_000 * Math.sin(i / 2) + i * 3_000_000),
]);

const TRACE_BUCKETS = REQUESTS.map(([date, value], i) => ({
  ok: Math.round(value * 0.6),
  error: FAILURES[i][1],
  remaining: Math.round(value * 0.4),
  timeBucketStart: date,
  timeBucketEnd: new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString(),
}));

const HIGHEST_REQUESTS = Math.max(...REQUESTS.map(([, value]) => value));

// Layout

function Compare(props: { before: ReactNode; after?: ReactNode; afterNote?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-fg-secondary text-xs font-medium uppercase">Before</span>
      {props.before}
      <span className="text-fg-secondary pt-3 text-xs font-medium uppercase">After</span>
      {props.after ?? <p className="text-fg-default max-w-prose text-xs">{props.afterNote}</p>}
    </div>
  );
}

function Page(props: { children: ReactNode }) {
  return <div className="flex w-[56rem] flex-col gap-12">{props.children}</div>;
}

function RaisedCard(props: {
  title: string;
  description: string | ReactElement;
  children: ReactNode;
}) {
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

// Insights

function OperationsAfter() {
  const { colors } = useChartTheme();
  return (
    <RaisedCard title="Operations over time" description="Timeline of GraphQL requests and failures">
      <TimeSeriesChart
        kind="area"
        legend
        valueFormatter={formatNumber}
        series={[
          { name: 'Requests', data: REQUESTS, color: colors.primary },
          { name: 'Failures', data: FAILURES, color: colors.error },
        ]}
      />
    </RaisedCard>
  );
}

function LatencyAfter() {
  const { colors } = useChartTheme();
  const percentile = (key: 'p75' | 'p90' | 'p95' | 'p99') =>
    DURATIONS.map((node): [string, number] => [node.date, node.duration[key]]);
  return (
    <RaisedCard title="Latency over time" description="Timeline of latency of GraphQL requests">
      <TimeSeriesChart
        kind="line"
        legend
        valueFormatter={value => formatDuration(value, true)}
        series={[
          { name: 'p75', data: percentile('p75'), color: colors.p75 },
          { name: 'p90', data: percentile('p90'), color: colors.p90 },
          { name: 'p95', data: percentile('p95'), color: colors.p95 },
          { name: 'p99', data: percentile('p99'), color: colors.p99 },
        ]}
      />
    </RaisedCard>
  );
}

export const Insights = createPreview({
  label: 'Insights',
  render: () => (
    <Page>
      <CallSiteGroup label="Over time">
        <CallSite
          source="components/target/insights/stats.tsx:267"
          origin="raw"
          note="The legend moves under the chart. Fills fade to the baseline."
        >
          <Compare
            before={
              <OverTimeStats
                operationStats={makeFragmentData(
                  {
                    __typename: 'OperationsStats',
                    requestsOverTime: points(REQUESTS, 'RequestsOverTime'),
                    failuresOverTime: points(FAILURES, 'FailuresOverTime'),
                  },
                  OverTimeStats_OperationsStatsFragment,
                )}
              />
            }
            after={<OperationsAfter />}
          />
        </CallSite>
        <CallSite source="components/target/insights/stats.tsx:840" origin="raw">
          <Compare
            before={
              <LatencyOverTimeStats
                operationStats={makeFragmentData(
                  { __typename: 'OperationsStats', durationOverTime: DURATIONS },
                  LatencyOverTimeStats_OperationStatsFragment,
                )}
              />
            }
            after={<LatencyAfter />}
          />
        </CallSite>
        <CallSite
          source="components/target/insights/stats.tsx:942"
          origin="raw"
          note="The one-item legend goes: with one series it names nothing the title does not."
        >
          <Compare
            before={
              <RpmOverTimeStats
                period={PERIOD}
                resolution={RESOLUTION}
                operationStats={makeFragmentData(
                  { __typename: 'OperationsStats', requestsOverTime: points(REQUESTS, 'RequestsOverTime') },
                  RpmOverTimeStats_OperationStatsFragment,
                )}
              />
            }
            after={
              <RaisedCard title="RPM over time" description="Requests per minute">
                <TimeSeriesChart
                  kind="bar"
                  valueFormatter={formatRpm}
                  series={[{ name: 'RPM', data: RPM }]}
                />
              </RaisedCard>
            }
          />
        </CallSite>
      </CallSiteGroup>
    </Page>
  ),
});

// Clients, transcribed: ClientsStats reads the target route's params, which the preview router
// cannot provide. The data is what its memos derive from the clients query.

function ClientsBefore() {
  const { styles, colors } = useChartStyles();
  return (
    <RaisedCard title="Clients" description="Top 5 - GraphQL API consumers">
      <AutoSizer disableHeight className="mt-5 flex w-full flex-row gap-x-4">
        {size => {
          if (!size.width) {
            return <></>;
          }

          const gapX4 = 16;
          const innerWidth = size.width - gapX4 * 2;

          return (
            <>
              <ReactECharts
                style={{
                  width: innerWidth / 2,
                  height: 200,
                }}
                option={{
                  ...styles,
                  grid: {
                    left: 20,
                    top: 20,
                    right: 20,
                    bottom: 20,
                    containLabel: true,
                  },
                  tooltip: {
                    trigger: 'item',
                    formatter: '{b0}: {c0}%',
                  },
                  xAxis: {
                    type: 'value',
                    splitLine: {
                      lineStyle: {
                        color: colors.grid,
                        type: 'dashed',
                      },
                    },
                    axisLabel: {
                      formatter: '{value}%',
                    },
                  },
                  yAxis: {
                    type: 'category',
                    data: BY_CLIENT.labels,
                    triggerEvent: true,
                  },
                  series: [
                    {
                      type: 'bar',
                      data: BY_CLIENT.values,
                      color: colors.primary,
                    },
                  ],
                }}
              />
              <ReactECharts
                style={{ width: innerWidth / 2, height: 200 }}
                option={{
                  ...styles,
                  grid: {
                    left: 20,
                    top: 20,
                    right: 20,
                    bottom: 20,
                    containLabel: true,
                  },
                  tooltip: {
                    trigger: 'item',
                    formatter: '{b0}: {c0}%',
                  },
                  xAxis: {
                    type: 'value',
                    splitLine: {
                      lineStyle: {
                        color: colors.grid,
                        type: 'dashed',
                      },
                    },
                    axisLabel: {
                      formatter: '{value}%',
                    },
                  },
                  yAxis: {
                    type: 'category',
                    data: BY_VERSION.labels,
                  },
                  series: [
                    {
                      type: 'bar',
                      data: BY_VERSION.values,
                      color: colors.primary,
                    },
                  ],
                }}
              />
            </>
          );
        }}
      </AutoSizer>
    </RaisedCard>
  );
}

function ClientsAfter() {
  const theme = useChartTheme();
  const bars = (data: { labels: string[]; values: string[] }): EChartsOption => ({
    grid: theme.grid(),
    tooltip: { ...theme.tooltip(), trigger: 'item', formatter: '{b0}: {c0}%' },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.colors.gridSubtle } },
      axisLabel: { ...theme.axisLabel, formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: data.labels,
      triggerEvent: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: theme.axisLabel,
    },
    series: [{ type: 'bar', data: data.values, color: theme.colors.primary }],
  });
  return (
    <RaisedCard title="Clients" description="Top 5 - GraphQL API consumers">
      <div className="mt-5 grid grid-cols-2 gap-x-4">
        <Chart option={bars(BY_CLIENT)} height={200} />
        <Chart option={bars(BY_VERSION)} height={200} />
      </div>
    </RaisedCard>
  );
}

function TreemapBefore() {
  const { styles, colors } = useChartStyles();
  return (
    <AutoSizer disableHeight className="mt-5 w-full">
      {size => {
        if (!size.width) {
          return <></>;
        }

        const gapX4 = 16;
        const innerWidth = size.width - gapX4;

        return (
          <ReactECharts
            style={{ width: innerWidth, height: 400, marginLeft: 'auto', marginRight: 'auto' }}
            option={{
              ...styles,
              grid: {
                left: 20,
                top: 20,
                right: 20,
                bottom: 20,
                containLabel: true,
              },
              tooltip: {
                trigger: 'item',
                formatter(dataPoint: {
                  data: {
                    path: string;
                    name: string;
                    value: number;
                  };
                }) {
                  return `<div>${dataPoint.data.path ?? dataPoint.data.name}</div>Operations: <b>${formatNumber(dataPoint.data.value)}</b>`;
                },
              },
              legend: {
                show: false,
              },
              series: [
                {
                  name: 'All clients and versions',
                  type: 'treemap',
                  label: {
                    position: ['50%', '50%'],
                    offset: [0, -15],
                    show: true,
                    formatter: '{a|{b}}',
                    overflow: 'none',
                    align: 'center',
                    rich: {
                      a: {
                        padding: 4,
                        height: 15,
                        color: colors.overlayText,
                        backgroundColor: colors.overlayBg,
                      },
                    },
                  },
                  upperLabel: {
                    show: true,
                    height: 30,
                    formatter: '{b}',
                    color: styles.textStyle.color,
                    backgroundColor: 'transparent',
                    padding: 5,
                    fontWeight: 'bold',
                    overflow: 'none',
                  },
                  itemStyle: {
                    borderColor: colors.overlayBorder,
                  },
                  levels: TREEMAP_LEVELS,
                  data: BY_CLIENT_AND_VERSION,
                  color: colors.primary,
                },
              ],
            }}
          />
        );
      }}
    </AutoSizer>
  );
}

/** `getLevelOption()` from stats.tsx. */
const TREEMAP_LEVELS = [
  {
    itemStyle: {
      borderWidth: 0,
      gapWidth: 5,
    },
  },
  {
    itemStyle: {
      gapWidth: 1,
    },
  },
  {
    colorSaturation: [0.35, 0.5],
    itemStyle: {
      gapWidth: 1,
      borderColorSaturation: 0.6,
    },
  },
];

export const Clients = createPreview({
  label: 'Clients',
  render: () => (
    <Page>
      <CallSite
        source="components/target/insights/stats.tsx:574, 621"
        origin="raw"
        note="Same bars and click-through; the axes, grid and tooltip take the shared look."
      >
        <Compare before={<ClientsBefore />} after={<ClientsAfter />} />
      </CallSite>
      <CallSite source="components/target/insights/stats.tsx:676" origin="raw">
        <Compare
          before={<TreemapBefore />}
          afterNote="Unchanged apart from the tooltip, which takes the overlay colors. It moves onto Chart in the Insights swap and is checked there."
        />
      </CallSite>
    </Page>
  ),
});

// Coordinate and client pages, transcribed: each chart sits inline in a page with its own query.

/** The option both Activity charts and the coordinate resolutions chart share today. */
function useInsightsPageOption() {
  const { styles, colors } = useChartStyles();
  return {
    colors,
    base: {
      ...styles,
      grid: {
        left: 20,
        top: 5,
        right: 5,
        bottom: 5,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        show: false,
      },
      xAxis: [
        {
          type: 'time',
          boundaryGap: false,
        },
      ],
      yAxis: [
        {
          type: 'value',
          min: 0,
          splitLine: {
            lineStyle: {
              color: colors.grid,
              type: 'dashed',
            },
          },
          axisLabel: {
            formatter: (value: number) => formatNumber(value),
          },
        },
      ],
    },
  };
}

function ActivityBefore(props: { description: string | ReactElement }) {
  const { base, colors } = useInsightsPageOption();
  return (
    <RaisedCard title="Activity" description={props.description}>
      <AutoSizer disableHeight>
        {size => (
          <ReactECharts
            style={{ width: size.width, height: 200 }}
            option={{
              ...base,
              series: [
                {
                  type: 'line',
                  name: 'Requests',
                  showSymbol: false,
                  smooth: false,
                  color: colors.primary,
                  areaStyle: {},
                  emphasis: {
                    focus: 'series',
                  },
                  large: true,
                  data: REQUESTS,
                },
              ],
            }}
          />
        )}
      </AutoSizer>
    </RaisedCard>
  );
}

function ActivityAfter(props: { description: string | ReactElement }) {
  return (
    <RaisedCard title="Activity" description={props.description}>
      <TimeSeriesChart
        kind="area"
        valueFormatter={formatNumber}
        series={[{ name: 'Requests', data: REQUESTS }]}
      />
    </RaisedCard>
  );
}

function ResolutionsBefore() {
  const { base, colors } = useInsightsPageOption();
  const resolutionsOverTime = mapValues(REQUESTS, value => value * 3);
  const errorsOverTime = FAILURES;
  return (
    <div>
      <p className="text-fg-secondary text-control pb-4">
        Number of times the coordinate Query.user has resolved over time
      </p>
      <AutoSizer disableHeight>
        {size => (
          <ReactECharts
            style={{ width: size.width, height: 200 }}
            option={{
              ...base,
              series: [
                resolutionsOverTime?.length
                  ? {
                      type: 'line',
                      name: 'Resolutions',
                      showSymbol: false,
                      smooth: false,
                      color: colors.primary,
                      areaStyle: {},
                      emphasis: {
                        focus: 'series',
                      },
                      large: true,
                      data: resolutionsOverTime,
                    }
                  : undefined,
                errorsOverTime?.length
                  ? {
                      type: 'line',
                      name: 'Errors',
                      showSymbol: false,
                      smooth: false,
                      color: colors.error,
                      areaStyle: {},
                      emphasis: {
                        focus: 'series',
                      },
                      large: true,
                      data: errorsOverTime,
                    }
                  : undefined,
              ],
            }}
          />
        )}
      </AutoSizer>
    </div>
  );
}

function ResolutionsAfter() {
  const { colors } = useChartTheme();
  return (
    <div>
      <p className="text-fg-secondary text-control pb-4">
        Number of times the coordinate Query.user has resolved over time
      </p>
      <TimeSeriesChart
        kind="area"
        valueFormatter={formatNumber}
        series={[
          { name: 'Resolutions', data: mapValues(REQUESTS, value => value * 3), color: colors.primary },
          { name: 'Errors', data: FAILURES, color: colors.error },
        ]}
      />
    </div>
  );
}

function ErrorActivityBefore() {
  const { base, colors } = useInsightsPageOption();
  const errorColors = [colors.error, colors.p99, colors.p95, colors.p90, colors.p75];
  return (
    <RaisedCard title="Error Activity" description="Error codes returned by Query.user over time">
      <AutoSizer disableHeight>
        {size => (
          <ReactECharts
            style={{ width: size.width, height: 200 }}
            option={{
              ...base,
              series: Object.keys(ERROR_CODES).map((errorCode, i) => ({
                type: 'bar',
                name: errorCode ?? 'undefined',
                showSymbol: false,
                smooth: false,
                color: i < 5 ? errorColors[i] : stringToHiveColor(errorCode),
                areaStyle: {},
                emphasis: {
                  focus: 'series',
                },
                large: true,
                data: ERROR_CODES[errorCode],
              })),
            }}
          />
        )}
      </AutoSizer>
    </RaisedCard>
  );
}

function ErrorActivityAfter() {
  const { colors } = useChartTheme();
  const errorColors = [colors.error, colors.p99, colors.p95, colors.p90, colors.p75];
  return (
    <RaisedCard title="Error Activity" description="Error codes returned by Query.user over time">
      <TimeSeriesChart
        kind="bar"
        valueFormatter={formatNumber}
        series={Object.keys(ERROR_CODES).map((errorCode, i) => ({
          name: errorCode,
          data: ERROR_CODES[errorCode],
          color: i < 5 ? errorColors[i] : stringToHiveColor(errorCode),
        }))}
      />
    </RaisedCard>
  );
}

export const CoordinateAndClient = createPreview({
  label: 'Coordinate and client',
  render: () => (
    <Page>
      <CallSite source="pages/target-insights-coordinate.tsx:333" origin="raw">
        <Compare
          before={
            <ActivityBefore description={<>GraphQL requests with Query.user over time</>} />
          }
          after={<ActivityAfter description={<>GraphQL requests with Query.user over time</>} />}
        />
      </CallSite>
      <CallSite
        source="pages/target-insights-coordinate.tsx:396"
        origin="raw"
        note="Shown under Activity when field-level metrics are on. Two series and no legend today; kept that way."
      >
        <Compare before={<ResolutionsBefore />} after={<ResolutionsAfter />} />
      </CallSite>
      <CallSite
        source="pages/target-insights-coordinate.tsx:603"
        origin="raw"
        note="One bar series per error code, side by side rather than stacked. No legend today; the codes are listed in the Errors card beside it."
      >
        <Compare before={<ErrorActivityBefore />} after={<ErrorActivityAfter />} />
      </CallSite>
      <CallSite source="pages/target-insights-client.tsx:170" origin="raw">
        <Compare
          before={<ActivityBefore description="GraphQL requests from web-app over time" />}
          after={<ActivityAfter description="GraphQL requests from web-app over time" />}
        />
      </CallSite>
    </Page>
  ),
});

// Admin and subscription

function SubscriptionBefore() {
  const { styles, colors } = useChartStyles();
  const numberFormatter = Intl.NumberFormat('en-US');
  return (
    <Card variants={{ onSurface: 'base', titleSize: 'large' }} title="Historical Usage">
      <div className="mt-4">
        <AutoSizer disableHeight>
          {size => (
            <ReactECharts
              style={{ width: size.width, height: 400 }}
              option={{
                ...styles,
                grid: {
                  left: 20,
                  top: 50,
                  right: 20,
                  bottom: 20,
                  containLabel: true,
                },
                legend: {
                  show: false,
                },
                tooltip: {
                  trigger: 'axis',
                  valueFormatter: (value: number) => formatNumber(value),
                  formatter(params: any[]) {
                    const param = params[0];
                    const value = param.data[1];

                    return `<strong>${numberFormatter.format(value)}</strong>`;
                  },
                },
                xAxis: [
                  {
                    type: 'time',
                    splitNumber: 12,
                  },
                ],
                yAxis: [
                  {
                    type: 'value',
                    boundaryGap: false,
                    min: 0,
                    axisLabel: {
                      formatter: (value: number) => formatNumber(value),
                    },
                    splitLine: {
                      lineStyle: {
                        color: colors.gridSubtle,
                        type: 'dashed',
                      },
                    },
                  },
                ],
                series: [
                  {
                    type: 'bar',
                    name: 'Events',
                    showSymbol: false,
                    boundaryGap: false,
                    color: colors.line,
                    areaStyle: {},
                    emphasis: {
                      focus: 'series',
                    },
                    data: MONTHLY_USAGE,
                  },
                ],
              }}
            />
          )}
        </AutoSizer>
      </div>
    </Card>
  );
}

function SubscriptionAfter() {
  const { colors } = useChartTheme();
  return (
    <Card variants={{ onSurface: 'base', titleSize: 'large' }} title="Historical Usage">
      <div className="mt-4">
        <TimeSeriesChart
          kind="bar"
          height={400}
          valueFormatter={formatNumber}
          series={[{ name: 'Events', data: MONTHLY_USAGE, color: colors.line }]}
        />
      </div>
    </Card>
  );
}

export const AdminAndSubscription = createPreview({
  label: 'Admin and subscription',
  render: () => (
    <Page>
      <CallSite
        source="components/admin/admin-stats.tsx:64"
        origin="raw"
        note="Loses its curve smoothing (no other chart smooths) and its one-item legend."
      >
        <Compare
          before={
            <CollectedOperationsOverTime
              operations={REQUESTS.map(([date, value]) =>
                makeFragmentData(
                  { __typename: 'AdminOperationPoint', date, count: value },
                  CollectedOperationsOverTime_OperationFragment,
                ),
              )}
            />
          }
          after={
            <TimeSeriesChart
              kind="area"
              valueFormatter={formatNumber}
              series={[{ name: 'Collected operations', data: REQUESTS }]}
            />
          }
        />
      </CallSite>
      <CallSite
        source="pages/organization-subscription.tsx:171"
        origin="raw"
        note="The tooltip gains the month and series name; today it shows the bare total."
      >
        <Compare before={<SubscriptionBefore />} after={<SubscriptionAfter />} />
      </CallSite>
    </Page>
  ),
});

// Alerts: already the target look. Shown as the reference the rest is matched to; their swap only
// moves them onto Chart and the shared theme, and is checked at the call site.

const ALERT_STATS = makeFragmentData(
  {
    __typename: 'OperationsStats',
    requestsOverTime: points(REQUESTS, 'RequestsOverTime'),
    failuresOverTime: points(FAILURES, 'FailuresOverTime'),
    durationOverTime: DURATIONS,
  },
  AlertMetricChart_OperationsStatsFragment,
);

const LAST_TWO_DAYS = REQUESTS.length - 48;
const ALERT_STATS_TWO_WINDOWS = makeFragmentData(
  {
    __typename: 'OperationsStats',
    requestsOverTime: points(REQUESTS.slice(LAST_TWO_DAYS), 'RequestsOverTime'),
    failuresOverTime: points(FAILURES.slice(LAST_TWO_DAYS), 'FailuresOverTime'),
    durationOverTime: DURATIONS.slice(LAST_TWO_DAYS),
  },
  AlertMetricChart_OperationsStatsFragment,
);

const SEVERITIES = [
  MetricAlertRuleSeverity.Critical,
  MetricAlertRuleSeverity.Warning,
  MetricAlertRuleSeverity.Info,
];
const ACTIVITY_EVENTS = Array.from({ length: 24 }, (_, i) => ({
  toState: i % 4 === 3 ? MetricAlertRuleState.Normal : MetricAlertRuleState.Firing,
  createdAt: REQUESTS[(i * 37) % REQUESTS.length][0],
  rule: { severity: SEVERITIES[i % 3] },
}));

export const Alerts = createPreview({
  label: 'Alerts',
  render: () => (
    <Page>
      <CallSite
        source="pages/target-alerts-detail.tsx:355"
        origin="raw"
        note="A p99 latency rule over 1s, fixed value, one-day window."
      >
        <AlertMetricChart
          stats={ALERT_STATS}
          loading={false}
          type={MetricAlertRuleType.Latency}
          metric={MetricAlertRuleMetric.P99}
          severity={MetricAlertRuleSeverity.Critical}
          thresholdValue={1000}
          direction="ABOVE"
          thresholdType="FIXED_VALUE"
          timeWindowMinutes={1440}
          evaluatedAt={TO}
        />
      </CallSite>
      <CallSite
        source="components/target/alerts/alert-form.tsx:847"
        origin="raw"
        note="The form's preview: a traffic rule, 20% change over a one-day window, two windows fetched."
      >
        <AlertMetricChart
          stats={ALERT_STATS_TWO_WINDOWS}
          loading={false}
          type={MetricAlertRuleType.Traffic}
          severity={MetricAlertRuleSeverity.Warning}
          thresholdValue={20}
          direction="ABOVE"
          thresholdType="PERCENTAGE_CHANGE"
          timeWindowMinutes={1440}
          clipToCurrentWindow
        />
      </CallSite>
      <CallSite source="pages/target-alerts-activity.tsx:228" origin="raw">
        <AlertActivityChart events={ACTIVITY_EVENTS} from={FROM} to={TO} />
      </CallSite>
    </Page>
  ),
});

// Cards

export const Cards = createPreview({
  label: 'Cards',
  render: () => (
    <div className="flex w-[24rem] flex-col gap-12">
      <CallSite
        source="components/organization/project-card.tsx:32, pages/project.tsx:40"
        origin="raw"
        note="Reload: Before draws in twice, After once. Only the chart changes; the card around it stays."
      >
        <Compare
          before={
            <ResourceCard
              kind="project"
              name="gateway"
              subtitle="Federation"
              renderLink={children => <div className="block pb-5 pt-4">{children}</div>}
              highestNumberOfRequests={HIGHEST_REQUESTS}
              requestsOverTime={points(REQUESTS, 'RequestsOverTime')}
              schemaVersionsCount={12}
              days={7}
            />
          }
          after={<Sparkline name="Requests" data={REQUESTS} max={HIGHEST_REQUESTS} />}
        />
      </CallSite>
    </div>
  ),
});

// Traces, transcribed: the page module pulls in the whole route tree. Drag-to-select is left out,
// since it goes with the swap.

const chartConfig = {
  ok: {
    label: 'Successful',
    color: 'hsl(var(--chart-1))',
  },
  error: {
    label: 'Failed',
    color: 'hsl(var(--chart-2))',
  },
  remaining: {
    label: 'Remaining',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function TracesBefore() {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[150px] w-full select-none">
      <BarChart accessibilityLayer data={TRACE_BUCKETS}>
        <XAxis
          dataKey="timeBucketStart"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={date => {
            return formatDate(date);
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[150px]"
              labelFormatter={(_, data) => {
                const payload = data[0]?.payload;

                if (!payload) {
                  return null;
                }

                return (
                  formatDate(payload.timeBucketStart) + ' - ' + formatDate(payload.timeBucketEnd)
                );
              }}
            />
          }
        />
        <Bar stackId="all" dataKey="ok" fill="var(--color-ok)" name="Ok" />
        <Bar stackId="all" dataKey="error" fill="var(--color-error)" name="Error" />
        <Bar stackId="all" dataKey="remaining" fill="rgba(170,175,180,0.1)" name="Filtered out" />
      </BarChart>
    </ChartContainer>
  );
}

function TracesAfter() {
  const { colors } = useChartTheme();
  const series = (key: 'ok' | 'error' | 'remaining') =>
    TRACE_BUCKETS.map((bucket): [string, number] => [bucket.timeBucketStart, bucket[key]]);
  return (
    <TimeSeriesChart
      kind="bar"
      stacked
      height={150}
      valueFormatter={formatNumber}
      series={[
        { name: 'Ok', data: series('ok'), color: colors.primary },
        { name: 'Error', data: series('error'), color: colors.error },
        { name: 'Filtered out', data: series('remaining'), color: 'rgba(170,175,180,0.1)' },
      ]}
    />
  );
}

export const Traces = createPreview({
  label: 'Traces',
  render: () => (
    <Page>
      <CallSite
        source="pages/target-traces.tsx:148"
        origin="raw"
        note="Recharts today. Gains a y-axis (Recharts drew none) and the shared tooltip; drag-to-select goes."
      >
        <Compare before={<TracesBefore />} after={<TracesAfter />} />
      </CallSite>
    </Page>
  ),
});
