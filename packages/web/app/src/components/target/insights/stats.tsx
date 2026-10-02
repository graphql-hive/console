import { ReactElement, useCallback, useMemo, useState } from 'react';
import { differenceInMilliseconds } from 'date-fns';
import type { EChartsOption } from 'echarts';
import {
  ActivityIcon,
  BookIcon,
  ChevronUp,
  FrownIcon,
  GaugeIcon,
  GlobeIcon,
  PercentIcon,
  SmileIcon,
} from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/primitives/button/button';
import { Card } from '@/components/ui/primitives/card/card';
import { Chart } from '@/components/ui/primitives/chart/chart';
import { useChartTheme, type ChartTheme } from '@/components/ui/primitives/chart/chart-theme';
import { TimeSeriesChart } from '@/components/ui/primitives/chart/time-series-chart';
import { StatCard } from '@/components/ui/stat-card/stat-card';
import { FragmentType, graphql, useFragment } from '@/gql';
import { OperationStatsFilterInput } from '@/gql/graphql';
import {
  formatDuration,
  formatNumber,
  formatRpm,
  toDecimal,
  useFormattedDuration,
  useFormattedNumber,
  useFormattedThroughput,
  useSlugs,
} from '@/lib/hooks';
import { carriedRange } from '@/lib/hooks/use-date-range-controller';
import { useRouter } from '@tanstack/react-router';
import { OperationsFallback } from './fallback';
import { resolutionToMilliseconds } from './utils';

export const Stats_GeneralOperationsStatsQuery = graphql(`
  query Stats_GeneralOperationsStats(
    $targetSelector: TargetSelectorInput!
    $period: DateRangeInput!
    $filter: OperationStatsFilterInput!
    $resolution: Int!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      allOperations: operationsStats(period: $period) {
        totalRequests
      }
      operationsStats(period: $period, filter: $filter) {
        ... on OperationsStats {
          totalRequests
          totalFailures
          totalOperations
          duration {
            p75
            p90
            p95
            p99
          }
        }
        ...OverTimeStats_OperationsStatsFragment
        ...RpmOverTimeStats_OperationStatsFragment
        ...LatencyOverTimeStats_OperationStatsFragment
        ...ClientsStats_OperationsStatsFragment
      }
    }
  }
`);

function RequestsStats({
  requests = 0,
}: {
  requests?: number;
  dateRangeText: string;
}): ReactElement {
  const value = useFormattedNumber(requests);

  return (
    <StatCard title="Requests" icon={GlobeIcon} value={value} caption="Total requests served" />
  );
}

function UniqueOperationsStats({
  operations = 0,
  dateRangeText,
}: {
  operations?: number;
  dateRangeText: string;
}): ReactElement {
  const value = useFormattedNumber(operations);

  return (
    <StatCard
      title="Operations"
      icon={BookIcon}
      value={value}
      caption={`Distinct GraphQL operations in ${dateRangeText}`}
    />
  );
}

function OperationRelativeFrequency({
  allOperationRequests,
  operationRequests,
}: {
  allOperationRequests: number;
  operationRequests: number;
  dateRangeText: string;
}): ReactElement {
  const rate = allOperationRequests
    ? `${toDecimal((operationRequests * 100) / allOperationRequests)}%`
    : '-';

  return (
    <StatCard
      title="Relative Request Frequency"
      icon={PercentIcon}
      value={rate}
      caption="The impact on the overall API traffic"
    />
  );
}

function PercentileStats({
  value,
  percentile,
  dateRangeText,
}: {
  value?: number;
  percentile: number;
  dateRangeText: string;
}): ReactElement {
  const formatted = useFormattedDuration(value);

  return (
    <StatCard
      title={`p${percentile}`}
      icon={GaugeIcon}
      value={formatted}
      caption={`Latency p${percentile} in ${dateRangeText}`}
    />
  );
}

function RPM({
  period,
  dateRangeText,
  requests = 0,
}: {
  requests?: number;
  dateRangeText: string;
  period: {
    from: string;
    to: string;
  };
}): ReactElement {
  const throughput = useFormattedThroughput({
    requests,
    window: differenceInMilliseconds(new Date(period.to), new Date(period.from)),
  });

  return (
    <StatCard
      title="Requests per minute"
      icon={ActivityIcon}
      value={throughput}
      caption={`Throughput in ${dateRangeText}`}
    />
  );
}

function SuccessRateStats({
  requests = 0,
  totalFailures = 0,
  dateRangeText,
}: {
  requests?: number;
  totalFailures?: number;
  dateRangeText: string;
}): ReactElement {
  const rate =
    requests || totalFailures
      ? `${toDecimal(((requests - totalFailures) * 100) / requests)}%`
      : '-';

  return (
    <StatCard
      variants={{ tone: 'success' }}
      title="Success rate"
      icon={SmileIcon}
      value={rate}
      caption={`Successful requests in ${dateRangeText}`}
    />
  );
}

function FailureRateStats({
  requests = 0,
  totalFailures = 0,
  dateRangeText,
}: {
  requests?: number;
  totalFailures?: number;
  dateRangeText: string;
}): ReactElement {
  const rate = requests || totalFailures ? `${toDecimal((totalFailures * 100) / requests)}%` : '-';

  return (
    <StatCard
      variants={{ tone: 'danger' }}
      title="Failure rate"
      icon={FrownIcon}
      value={rate}
      caption={`Failed requests in ${dateRangeText}`}
    />
  );
}

const OverTimeStats_OperationsStatsFragment = graphql(`
  fragment OverTimeStats_OperationsStatsFragment on OperationsStats {
    failuresOverTime(resolution: $resolution) {
      date
      value
    }
    requestsOverTime(resolution: $resolution) {
      date
      value
    }
  }
`);

function OverTimeStats({
  operationStats,
}: {
  operationStats: FragmentType<typeof OverTimeStats_OperationsStatsFragment> | null;
}): ReactElement {
  const { failuresOverTime = [], requestsOverTime = [] } =
    useFragment(OverTimeStats_OperationsStatsFragment, operationStats) ?? {};

  const { colors } = useChartTheme();

  const requests = useMemo(() => {
    if (requestsOverTime?.length) {
      return requestsOverTime.map<[string, number]>(node => [node.date, node.value]);
    }

    return []; // it will use the previous data points when new data is not available yet (fetching)
  }, [requestsOverTime]);

  const failures = useMemo(() => {
    if (failuresOverTime?.length) {
      return failuresOverTime.map<[string, number]>(node => [node.date, node.value]);
    }

    return []; // it will use the previous data points when new data is not available yet (fetching)
  }, [failuresOverTime]);

  return (
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title="Operations over time"
      description="Timeline of GraphQL requests and failures"
    >
      <TimeSeriesChart
        kind="area"
        legend
        valueFormatter={formatNumber}
        series={[
          { name: 'Requests', data: requests, color: colors.primary },
          { name: 'Failures', data: failures, color: colors.error },
        ]}
      />
    </Card>
  );
}

const ClientsStats_OperationsStatsFragment = graphql(`
  fragment ClientsStats_OperationsStatsFragment on OperationsStats {
    clients {
      edges {
        node {
          name
          count
          percentage
          versions {
            version
            count
            percentage
          }
        }
      }
    }
  }
`);

function getLevelOption() {
  return [
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
}

/** Horizontal bars of each label's share, in percent. */
function percentageBarsOption(
  theme: ChartTheme,
  labels: string[],
  values: string[],
  clickableLabels = false,
): EChartsOption {
  return {
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
      data: labels,
      triggerEvent: clickableLabels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: theme.axisLabel,
    },
    series: [{ type: 'bar', data: values, color: theme.colors.primary }],
  };
}

function ClientsStats(props: {
  operationStats: FragmentType<typeof ClientsStats_OperationsStatsFragment> | null;
}): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const router = useRouter();
  const theme = useChartTheme();
  const operationStats = useFragment(ClientsStats_OperationsStatsFragment, props.operationStats);
  const sortedClients = useMemo(() => {
    return operationStats?.clients.edges?.length
      ? operationStats.clients.edges
          .slice()
          .sort((a, b) => b.node.count - a.node.count)
          .map(edge => edge.node)
      : [];
  }, [operationStats?.clients.edges]);
  const otherClientsPrefix = 'Other clients';
  const byClient = useMemo(() => {
    let values: string[] = [];
    const labels: string[] = [];

    if (sortedClients?.length) {
      const total = sortedClients.reduce((acc, client) => acc + client.count, 0);
      const counts: number[] = [];

      for (let i = 0; i < sortedClients.length; i++) {
        const client = sortedClients[i];

        if (i < 4) {
          counts.push(client.count);
          labels.push(client.name);
        } else if (labels[4]) {
          counts[4] += client.percentage;
        } else {
          counts.push(client.count);
          labels.push(
            sortedClients.length === 5
              ? client.name
              : `${otherClientsPrefix} (${sortedClients.length - 4})`,
          );
        }
      }

      values = counts.map(value => toDecimal((value * 100) / total));
    }

    return { labels, values };
  }, [sortedClients]);

  const byVersion = useMemo(() => {
    let values: string[] = [];
    const labels: string[] = [];
    if (sortedClients?.length) {
      const total = sortedClients.reduce((acc, node) => acc + node.count, 0);
      const versions: Array<{
        name: string;
        count: number;
      }> = [];

      for (const client of sortedClients) {
        for (const version of client.versions) {
          versions.push({
            name: `${client.name}@${version.version.substr(0, 32)}`,
            count: version.count,
          });
        }
      }

      versions.sort((a, b) => b.count - a.count);

      const counts: number[] = [];
      for (let i = 0; i < versions.length; i++) {
        const version = versions[i];

        if (i < 4) {
          counts.push(version.count);
          labels.push(version.name);
        } else if (labels[4]) {
          counts[4] += version.count;
        } else {
          counts.push(version.count);
          labels.push(
            versions.length === 5 ? version.name : `Other versions (${versions.length - 4})`,
          );
        }
      }

      values = counts.map(value => toDecimal((value * 100) / total));
    }

    return { labels, values };
  }, [sortedClients]);

  const byClientAndVersion = useMemo(() => {
    const dataPoints: Array<{
      value: number;
      name: string;
      path: string;
      children: Array<{
        value: number;
        name: string;
        path: string;
      }>;
    }> = [];
    if (sortedClients?.length) {
      for (const client of sortedClients) {
        const versions: Array<{
          value: number;
          name: string;
          path: string;
        }> = [];

        for (const version of client.versions) {
          versions.push({
            value: version.count,
            name: version.version,
            path: `${client.name}@${version.version}`,
          });
        }

        dataPoints.push({
          value: client.count,
          name: client.name,
          path: client.name,
          children: versions,
        });
      }
    }
    return dataPoints;
  }, [sortedClients]);

  const [isOpen, setIsOpen] = useState(false);

  const onClientNameClick = useCallback(
    (ev: { componentType: string; targetType: string; value: string }) => {
      if (ev.componentType === 'yAxis' && ev.targetType === 'axisLabel') {
        if (ev.value.startsWith(otherClientsPrefix)) {
          // Label for "Other clients" was clicked, do nothing
          return;
        }

        void router.navigate({
          to: '/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name',
          params: {
            organizationSlug,
            projectSlug,
            targetSlug,
            name: ev.value,
          },
          search: carriedRange,
        });
      }
    },
    [router],
  );

  const clientBarEvents = useMemo(() => ({ click: onClientNameClick }), [onClientNameClick]);

  const byClientOption = useMemo(
    () => percentageBarsOption(theme, byClient.labels, byClient.values, true),
    [theme, byClient],
  );
  const byVersionOption = useMemo(
    () => percentageBarsOption(theme, byVersion.labels, byVersion.values),
    [theme, byVersion],
  );

  const byClientAndVersionOption = useMemo(
    (): EChartsOption => ({
      tooltip: {
        ...theme.tooltip(),
        trigger: 'item',
        formatter(dataPoint: any) {
          const data: { path?: string; name: string; value: number } = dataPoint.data;
          return `<div>${data.path ?? data.name}</div>Operations: <b>${formatNumber(data.value)}</b>`;
        },
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
                color: theme.colors.overlayText,
                backgroundColor: theme.colors.overlayBg,
              },
            },
          },
          upperLabel: {
            show: true,
            height: 30,
            formatter: '{b}',
            color: theme.colors.fg,
            backgroundColor: 'transparent',
            padding: 5,
            fontWeight: 'bold',
            overflow: 'none',
          },
          itemStyle: {
            borderColor: theme.colors.overlayBorder,
          },
          levels: getLevelOption(),
          data: byClientAndVersion,
          color: theme.colors.primary,
        },
      ],
    }),
    [theme, byClientAndVersion],
  );

  return (
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title="Clients"
      description="Top 5 - GraphQL API consumers"
    >
      <div className="mt-5 grid grid-cols-2 gap-x-4">
        <Chart option={byClientOption} height={200} onEvents={clientBarEvents} />
        <Chart option={byVersionOption} height={200} />
      </div>
      {isOpen ? (
        <div className="mt-5">
          <Chart option={byClientAndVersionOption} height={400} />
        </div>
      ) : null}
      <div className="mt-5 w-full text-center">
        <Button variant="outline" onClick={() => setIsOpen(value => !value)}>
          {isOpen ? (
            <>
              <ChevronUp className="mr-2 size-4" /> Hide
            </>
          ) : (
            'Display all versions'
          )}
        </Button>
      </div>
    </Card>
  );
}

const LatencyOverTimeStats_OperationStatsFragment = graphql(`
  fragment LatencyOverTimeStats_OperationStatsFragment on OperationsStats {
    durationOverTime(resolution: $resolution) {
      date
      duration {
        p75
        p90
        p95
        p99
      }
    }
  }
`);

function LatencyOverTimeStats({
  operationStats,
}: {
  operationStats?: FragmentType<typeof LatencyOverTimeStats_OperationStatsFragment> | null;
}): ReactElement {
  const { colors } = useChartTheme();
  const { durationOverTime: duration = [] } =
    useFragment(LatencyOverTimeStats_OperationStatsFragment, operationStats) ?? {};
  const p75 = useMemo(() => {
    if (duration?.length) {
      return duration.map<[string, number]>(node => [node.date, node.duration.p75]);
    }

    return []; // it will use the previous data points when new data is not available yet (fetching)
  }, [duration]);
  const p90 = useMemo(() => {
    if (duration?.length) {
      return duration.map<[string, number]>(node => [node.date, node.duration.p90]);
    }

    return []; // it will use the previous data points when new data is not available yet (fetching)
  }, [duration]);
  const p95 = useMemo(() => {
    if (duration?.length) {
      return duration.map<[string, number]>(node => [node.date, node.duration.p95]);
    }

    return []; // it will use the previous data points when new data is not available yet (fetching)
  }, [duration]);
  const p99 = useMemo(() => {
    if (duration?.length) {
      return duration.map<[string, number]>(node => [node.date, node.duration.p99]);
    }

    return []; // it will use the previous data points when new data is not available yet (fetching)
  }, [duration]);

  return (
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title="Latency over time"
      description="Timeline of latency of GraphQL requests"
    >
      <TimeSeriesChart
        kind="line"
        legend
        valueFormatter={value => formatDuration(value, true)}
        series={[
          { name: 'p75', data: p75, color: colors.p75 },
          { name: 'p90', data: p90, color: colors.p90 },
          { name: 'p95', data: p95, color: colors.p95 },
          { name: 'p99', data: p99, color: colors.p99 },
        ]}
      />
    </Card>
  );
}

const RpmOverTimeStats_OperationStatsFragment = graphql(`
  fragment RpmOverTimeStats_OperationStatsFragment on OperationsStats {
    requestsOverTime(resolution: $resolution) {
      date
      value
    }
  }
`);

function RpmOverTimeStats({
  period,
  resolution,
  operationStats,
}: {
  period: {
    from: string;
    to: string;
  };
  resolution: number;
  operationStats: FragmentType<typeof RpmOverTimeStats_OperationStatsFragment> | null;
}): ReactElement {
  const { requestsOverTime: requests = [] } =
    useFragment(RpmOverTimeStats_OperationStatsFragment, operationStats) ?? {};

  const windowInM = resolutionToMilliseconds(resolution, period) / (60 * 1000);
  const rpmOverTime = useMemo(() => {
    if (requests.length) {
      return requests.map<[string, number]>(node => [
        node.date,
        parseFloat((node.value / windowInM).toFixed(4)),
      ]);
    }

    return []; // it will use the previous data points when new data is not available yet (fetching)
  }, [requests, windowInM]);

  return (
    <Card
      variants={{ onSurface: 'raised', titleSize: 'large' }}
      title="RPM over time"
      description="Requests per minute"
    >
      <TimeSeriesChart
        kind="bar"
        valueFormatter={formatRpm}
        series={[{ name: 'RPM', data: rpmOverTime }]}
      />
    </Card>
  );
}

export function OperationsStats({
  period,
  filter,
  resolution,
  mode,
  dateRangeText,
}: {
  period: {
    from: string;
    to: string;
  };
  dateRangeText: string;
  resolution: number;
  filter: OperationStatsFilterInput;
  mode: 'operation-page' | 'operation-list';
}): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query, refetchQuery] = useQuery({
    query: Stats_GeneralOperationsStatsQuery,
    variables: {
      targetSelector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
      period,
      filter,
      resolution,
    },
  });

  const refetch = useCallback(() => {
    refetchQuery({
      requestPolicy: 'cache-and-network',
    });
  }, [refetchQuery]);

  const isFetching = query.fetching;
  const isError = !!query.error;

  const operationsStats = query.data?.target?.operationsStats;
  const allOperationsStats = query.data?.target?.allOperations;
  dateRangeText = dateRangeText.toLowerCase();

  const state = isFetching
    ? 'fetching'
    : isError
      ? 'error'
      : !operationsStats?.totalRequests
        ? 'empty'
        : 'success';

  return (
    <section className="text-fg-subtle space-y-12 transition-opacity duration-700 ease-in-out">
      <OperationsFallback state={state} refetch={refetch}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RequestsStats requests={operationsStats?.totalRequests} dateRangeText={dateRangeText} />
          <RPM
            requests={operationsStats?.totalRequests}
            period={period}
            dateRangeText={dateRangeText}
          />
          {mode === 'operation-list' ? (
            <UniqueOperationsStats
              operations={operationsStats?.totalOperations}
              dateRangeText={dateRangeText}
            />
          ) : (
            <OperationRelativeFrequency
              allOperationRequests={allOperationsStats?.totalRequests ?? 0}
              operationRequests={operationsStats?.totalRequests ?? 0}
              dateRangeText={dateRangeText}
            />
          )}
          <SuccessRateStats
            requests={operationsStats?.totalRequests}
            totalFailures={operationsStats?.totalFailures}
            dateRangeText={dateRangeText}
          />
          <PercentileStats
            value={operationsStats?.duration?.p99}
            percentile={99}
            dateRangeText={dateRangeText}
          />
          <PercentileStats
            value={operationsStats?.duration?.p95}
            percentile={95}
            dateRangeText={dateRangeText}
          />
          <PercentileStats
            value={operationsStats?.duration?.p90}
            percentile={90}
            dateRangeText={dateRangeText}
          />
          <FailureRateStats
            requests={operationsStats?.totalRequests}
            totalFailures={operationsStats?.totalFailures}
            dateRangeText={dateRangeText}
          />
        </div>
      </OperationsFallback>
      <div>
        <OperationsFallback state={state} refetch={refetch}>
          <ClientsStats operationStats={operationsStats ?? null} />
        </OperationsFallback>
      </div>
      <div>
        <OperationsFallback state={state} refetch={refetch}>
          <OverTimeStats operationStats={operationsStats ?? null} />
        </OperationsFallback>
      </div>
      <div>
        <OperationsFallback state={state} refetch={refetch}>
          <RpmOverTimeStats
            period={period}
            resolution={resolution}
            operationStats={operationsStats ?? null}
          />
        </OperationsFallback>
      </div>
      <div>
        <OperationsFallback state={state} refetch={refetch}>
          <LatencyOverTimeStats operationStats={operationsStats ?? null} />
        </OperationsFallback>
      </div>
    </section>
  );
}
