import { useEffect, useMemo } from 'react';
import { differenceInMilliseconds } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import { ActivityIcon, BookIcon, GlobeIcon, HistoryIcon, RefreshCw } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import { Card } from '@/components/base/card/card';
import { StatCard } from '@/components/base/stat-card/stat-card';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Button } from '@/components/ui/button';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { graphql } from '@/gql';
import { formatNumber, formatThroughput, toDecimal } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { pick } from '@/lib/object';
import { useChartStyles } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

const ClientView_ClientStatsQuery = graphql(`
  query ClientView_ClientStatsQuery(
    $targetSelector: TargetSelectorInput!
    $period: DateRangeInput!
    $resolution: Int!
    $clientName: String!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      clientStats(period: $period, clientName: $clientName) {
        requestsOverTime(resolution: $resolution) {
          date
          value
        }
        totalRequests
        totalVersions
        operations {
          edges {
            node {
              id
              name
              operationHash
              count
            }
          }
        }
        versions(limit: 25) {
          version
          count
        }
      }
    }
  }
`);

function ClientView(props: {
  clientName: string;
  dataRetentionInDays: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { styles, colors } = useChartStyles();
  const dateRangeController = useDateRangeController({
    dataRetentionInDays: props.dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });

  const [query, refetch] = useQuery({
    query: ClientView_ClientStatsQuery,
    variables: {
      targetSelector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
      period: dateRangeController.resolvedRange,
      clientName: props.clientName,
      resolution: dateRangeController.resolution,
    },
  });

  useEffect(() => {
    if (!query.fetching) {
      refetch({ requestPolicy: 'network-only' });
    }
  }, [dateRangeController.resolvedRange]);

  const isLoading = query.fetching;
  const points = query.data?.target?.clientStats?.requestsOverTime;
  const requestsOverTime = useMemo(() => {
    if (!points) {
      return [];
    }

    return points.map(node => [node.date, node.value]);
  }, [points]);

  const totalRequests = query.data?.target?.clientStats?.totalRequests ?? 0;
  const totalVersions = query.data?.target?.clientStats?.totalVersions ?? 0;
  const totalOperations = query.data?.target?.clientStats?.operations.edges.length ?? 0;

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between py-6">
        <div>
          <Title>{props.clientName}</Title>
          <Subtitle>GraphQL API consumer insights</Subtitle>
        </div>
        <div className="flex justify-end gap-x-2">
          <DateRangePicker
            validUnits={['y', 'M', 'w', 'd', 'h']}
            selectedRange={dateRangeController.selectedPreset.range}
            startDate={dateRangeController.startDate}
            align="end"
            onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
          />
          <Button variant="outline" onClick={() => dateRangeController.refreshResolvedRange()}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-4 pb-8">
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-8">
          <div className="col-span-4">
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-2">
              <StatCard
                variants={{ onSurface: 'raised' }}
                title="Total calls"
                icon={GlobeIcon}
                value={isLoading ? '-' : formatNumber(totalRequests)}
                caption={`Requests in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
              />
              <StatCard
                variants={{ onSurface: 'raised' }}
                title="Requests per minute"
                icon={ActivityIcon}
                value={
                  isLoading
                    ? '-'
                    : formatThroughput(
                        totalRequests,
                        differenceInMilliseconds(
                          new Date(dateRangeController.resolvedRange.to),
                          new Date(dateRangeController.resolvedRange.from),
                        ),
                      )
                }
                caption={`RPM in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
              />
              <StatCard
                variants={{ onSurface: 'raised' }}
                title="Operations"
                icon={BookIcon}
                value={isLoading ? '-' : totalOperations}
                caption="Documents requested by selected client"
              />
              <StatCard
                variants={{ onSurface: 'raised' }}
                title="Versions"
                icon={HistoryIcon}
                value={isLoading ? '-' : totalVersions}
                caption={`Versions in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
              />
            </div>
          </div>
          <div className="col-span-4">
            <Card
              variants={{ onSurface: 'raised', titleSize: 'large' }}
              title="Activity"
              description={`GraphQL requests from ${props.clientName} over time`}
            >
              <AutoSizer disableHeight>
                {size => (
                  <ReactECharts
                    style={{ width: size.width, height: 200 }}
                    option={{
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
                          data: requestsOverTime,
                        },
                      ],
                    }}
                  />
                )}
              </AutoSizer>
            </Card>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 grid">
            <Card
              variants={{ onSurface: 'raised', titleSize: 'large' }}
              title="Operations"
              description={
                <>
                  {props.clientName} requested {isLoading ? '-' : totalOperations}{' '}
                  {totalOperations > 1 ? 'operations' : 'operation'} in{' '}
                  {dateRangeController.selectedPreset.label.toLowerCase()}
                </>
              }
            >
              <div className="max-h-[360px] overflow-y-auto">
                {isLoading
                  ? null
                  : query.data?.target?.clientStats.operations.edges.map(({ node: operation }) => (
                      <Link
                        key={operation.id}
                        className="text-neutral-11 hover:text-neutral-11 hover:bg-neutral-4 -mx-2 flex items-center rounded-md px-2 py-1 hover:underline hover:underline-offset-2"
                        to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                        params={{
                          organizationSlug: props.organizationSlug,
                          projectSlug: props.projectSlug,
                          targetSlug: props.targetSlug,
                          operationName: operation.name,
                          operationHash: operation.operationHash ?? '_',
                        }}
                        search={searchParams => pick(searchParams, ['from', 'to'])}
                      >
                        <p className="truncate text-sm font-medium">{operation.name}</p>
                        <div className="ml-auto flex min-w-[150px] flex-row items-center justify-end text-sm font-light">
                          <div>{formatNumber(operation.count)}</div>{' '}
                          <div className="min-w-[70px] text-right">
                            {toDecimal((operation.count * 100) / totalRequests)}%
                          </div>
                        </div>
                      </Link>
                    ))}
              </div>
            </Card>
          </div>

          <div className="col-span-3 grid">
            <Card
              variants={{ onSurface: 'raised', titleSize: 'large' }}
              title="Versions"
              description={
                <>
                  {props.clientName} had {isLoading ? '-' : totalVersions}{' '}
                  {totalVersions > 1 ? 'versions' : 'version'} in{' '}
                  {dateRangeController.selectedPreset.label.toLowerCase()}.
                  {!isLoading && totalVersions > 25
                    ? 'Displaying only 25 most popular versions'
                    : null}
                </>
              }
            >
              <div className="max-h-[360px] overflow-y-auto">
                {isLoading
                  ? null
                  : query.data?.target?.clientStats.versions.map(version => (
                      <div key={version.version} className="flex items-center py-1">
                        <p className="truncate text-sm font-medium">{version.version}</p>
                        <div className="ml-auto flex min-w-[150px] flex-row items-center justify-end text-sm font-light">
                          <div>{formatNumber(version.count)}</div>
                          <div className="min-w-[70px] text-right">
                            {toDecimal((version.count * 100) / totalRequests)}%
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

const ClientInsightsPageQuery = graphql(`
  query ClientInsightsPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      usageRetentionInDays
    }
    hasCollectedOperations(
      selector: {
        organizationSlug: $organizationSlug
        projectSlug: $projectSlug
        targetSlug: $targetSlug
      }
    )
  }
`);

function ClientInsightsPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  name: string;
}) {
  const [query] = useQuery({
    query: ClientInsightsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const currentOrganization = query.data?.organization;

  if (!currentOrganization) {
    return null;
  }

  if (!query.data?.hasCollectedOperations) {
    return (
      <div className="py-8">
        <EmptyList
          title="Hive is waiting for your first collected operation"
          description="You can collect usage of your GraphQL API with Hive Client"
          docsUrl="/schema-registry/usage-reporting"
        />
      </div>
    );
  }

  return (
    <ClientView
      clientName={props.name}
      dataRetentionInDays={currentOrganization.usageRetentionInDays}
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
    />
  );
}

export function TargetInsightsClientPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  name: string;
}) {
  return (
    <>
      <Meta title={`${props.name} - client`} />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Insights}
      >
        <ClientInsightsPageContent {...props} />
      </TargetLayout>
    </>
  );
}
