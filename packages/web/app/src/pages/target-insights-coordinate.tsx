import { useEffect, useMemo } from 'react';
import { differenceInMilliseconds } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import {
  ActivityIcon,
  AlertCircleIcon,
  BookIcon,
  GlobeIcon,
  RefreshCw,
  TabletSmartphoneIcon,
} from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { SupergraphMetadataList } from '@/components/target/explorer/super-graph-metadata';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { EmptyList } from '@/components/ui/empty-list';
import { Link as LegacyLink } from '@/components/ui/link';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { graphql } from '@/gql';
import { FieldLevelMetricsDisplayState } from '@/gql/graphql';
import { formatNumber, formatThroughput, toDecimal } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { cn, stringToHiveColor, useChartStyles } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

const SchemaCoordinateView_SchemaCoordinateStatsQuery = graphql(`
  query SchemaCoordinateView_SchemaCoordinateStatsQuery(
    $targetSelector: TargetSelectorInput!
    $period: DateRangeInput!
    $resolution: Int!
    $schemaCoordinate: String!
    $type: String!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      hasCollectedSubscriptionOperations
      fieldLevelMetricsDisplayState
      schemaCoordinateStats(period: $period, schemaCoordinate: $schemaCoordinate) {
        supergraphMetadata {
          ...SupergraphMetadataList_SupergraphMetadataFragment
        }
        requestsOverTime(resolution: $resolution) {
          date
          value
        }
        resolutionsOverTime(resolution: $resolution) {
          date
          value
        }
        totalRequests
        totalResolutions
        failuresOverTime(resolution: $resolution) {
          date
          value
        }
        totalFailures
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
        clients {
          edges {
            node {
              name
              count
            }
          }
        }
        errorCodes {
          edges {
            node {
              code
              count
            }
          }
        }
        errorCodesOverTime(resolution: $resolution) {
          code
          count
          date
        }
      }
      latestValidSchemaVersion {
        id
        explorer {
          type(name: $type) {
            __typename
          }
        }
      }
    }
  }
`);

function SchemaCoordinateView(props: {
  coordinate: string;
  dataRetentionInDays: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { styles, colors } = useChartStyles();
  const errorColors = [colors.error, colors.p99, colors.p95, colors.p90, colors.p75];
  const dateRangeController = useDateRangeController({
    dataRetentionInDays: props.dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });

  const typeName = props.coordinate.split('.')[0];

  const [query, refetch] = useQuery({
    query: SchemaCoordinateView_SchemaCoordinateStatsQuery,
    variables: {
      targetSelector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
      type: typeName,
      schemaCoordinate: props.coordinate,
      period: dateRangeController.resolvedRange,
      resolution: dateRangeController.resolution,
    },
  });

  useEffect(() => {
    if (!query.fetching) {
      refetch({ requestPolicy: 'network-only' });
    }
  }, [dateRangeController.resolvedRange]);

  const isLoading = query.fetching;
  const points = query.data?.target?.schemaCoordinateStats?.requestsOverTime;
  const requestsOverTime = useMemo(() => {
    if (!points) {
      return [];
    }

    return points.map(node => [node.date, node.value]);
  }, [points]);

  const resolutionPoints = query.data?.target?.schemaCoordinateStats?.resolutionsOverTime;
  const resolutionsOverTime = useMemo(() => {
    if (!resolutionPoints) {
      return [];
    }

    return resolutionPoints.map(node => [node.date, node.value]);
  }, [resolutionPoints]);

  const errorPoints = query.data?.target?.schemaCoordinateStats?.failuresOverTime;
  const errorsOverTime = useMemo(() => {
    if (!errorPoints) {
      return [];
    }

    return errorPoints.map(node => [node.date, node.value]);
  }, [errorPoints]);

  const errorCodesOverTime = useMemo(() => {
    const items = query.data?.target?.schemaCoordinateStats.errorCodesOverTime ?? [];
    return items.reduce(
      (grouped, item) => {
        grouped[item.code] ??= [];
        grouped[item.code].push([item.date, item.count]);

        return grouped;
      },
      {} as Record<string, [string, number][]>,
    );
  }, [query.data?.target?.schemaCoordinateStats.errorCodesOverTime]);
  const totalRequests = query.data?.target?.schemaCoordinateStats?.totalRequests ?? 0;
  const totalResolutions = query.data?.target?.schemaCoordinateStats?.totalResolutions ?? 0;
  const totalFailures = query.data?.target?.schemaCoordinateStats.totalFailures ?? null;
  const totalOperations = query.data?.target?.schemaCoordinateStats?.operations.edges.length ?? 0;
  const totalClients = query.data?.target?.schemaCoordinateStats?.clients.edges.length ?? 0;

  const supergraphMetadata = query.data?.target?.schemaCoordinateStats?.supergraphMetadata;
  const kind = query.data?.target?.latestValidSchemaVersion?.explorer?.type?.__typename;
  const title = kind === 'GraphQLEnumType' ? `${typeName} (${props.coordinate})` : props.coordinate;
  const fieldLevelMetricsDisplayState = query.data?.target?.fieldLevelMetricsDisplayState;
  const showFieldLevelMetrics =
    fieldLevelMetricsDisplayState === FieldLevelMetricsDisplayState.On ||
    fieldLevelMetricsDisplayState === FieldLevelMetricsDisplayState.OnWithWarning;

  if (query.error) {
    return <QueryError organizationSlug={props.organizationSlug} error={query.error} />;
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between py-6">
        <div>
          <div className="flex flex-row items-center justify-between">
            <Title className="pr-8">{title}</Title>
            {supergraphMetadata ? (
              <SupergraphMetadataList
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                supergraphMetadata={supergraphMetadata}
                previewThreshold={5}
              />
            ) : null}
          </div>
          <Subtitle>Schema coordinate insights</Subtitle>
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
      {query.data?.target?.hasCollectedSubscriptionOperations && (
        <div className="pb-8">
          <Alert>
            <AlertCircleIcon className="size-4" />
            <AlertTitle>No Subscription insights available yet.</AlertTitle>
            <AlertDescription>
              This page currently only shows the information for Query and Mutation operations. We
              are currently evaluating what kind of insights are useful for subscriptions.{' '}
              <LegacyLink
                as="a"
                variant="primary"
                href="https://github.com/graphql-hive/platform/issues/3290"
              >
                Please reach out to us directly or via the GitHub issue
              </LegacyLink>
              .
            </AlertDescription>
          </Alert>
        </div>
      )}
      {fieldLevelMetricsDisplayState === FieldLevelMetricsDisplayState.OnWithWarning ? (
        <div className="pb-8">
          <Alert className="border-info_10 bg-info_08 text-info">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>Coordinate resolutions were recently added.</AlertTitle>
            <AlertDescription>
              Your gateway was recently upgraded to add usage tracking for actual coordinate
              resolutions and errors. Please disregard the missing historic resolution data, as this
              data cannot be backfilled.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <div className="space-y-4 pb-8">
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-8">
          <div className="col-span-4">
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-2">
              <Card className="bg-neutral-2/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total calls</CardTitle>
                  <GlobeIcon className="text-neutral-10 size-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '-' : formatNumber(totalRequests)}
                  </div>
                  <p className="text-neutral-10 text-xs">
                    Requests in {dateRangeController.selectedPreset.label.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
              {showFieldLevelMetrics ? (
                <Card className="bg-neutral-2/50">
                  <CardHeader
                    className="flex flex-row items-center justify-between space-y-0 pb-2"
                    title="Resolution Count is the total number of times this specific field (schema coordinate) was executed and returned.

This differs from Request Count because a single request can resolve a field multiple times (e.g., inside an array) or skip it entirely (due to errors or conditional directives)."
                  >
                    <CardTitle className="text-sm font-medium">Total resolutions</CardTitle>
                    <GlobeIcon className="text-neutral-10 size-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoading ? '-' : formatNumber(totalResolutions)}
                      {totalFailures ? (
                        <span className="ml-2 text-sm font-normal text-red-500">
                          ({formatNumber(totalFailures)} errors)
                        </span>
                      ) : null}
                    </div>
                    <p className="text-neutral-10 text-xs">
                      Resolved in {dateRangeController.selectedPreset.label.toLowerCase()}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              <Card className="bg-neutral-2/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Requests per minute</CardTitle>
                  <ActivityIcon className="text-neutral-10 size-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading
                      ? '-'
                      : formatThroughput(
                          totalRequests,
                          differenceInMilliseconds(
                            new Date(dateRangeController.resolvedRange.to),
                            new Date(dateRangeController.resolvedRange.from),
                          ),
                        )}
                  </div>
                  <p className="text-neutral-10 text-xs">
                    RPM in {dateRangeController.selectedPreset.label.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-neutral-2/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Operations</CardTitle>
                  <BookIcon className="text-neutral-10 size-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '-' : totalOperations}</div>
                  <p className="text-neutral-10 text-xs">
                    GraphQL documents with selected coordinate
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-neutral-2/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Consumers</CardTitle>
                  <TabletSmartphoneIcon className="text-neutral-10 size-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '-' : totalClients}</div>
                  <p className="text-neutral-10 text-xs">
                    GraphQL clients in {dateRangeController.selectedPreset.label.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="col-span-4">
            <Card className="bg-neutral-2/50 flex h-full flex-col">
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>
                  GraphQL requests with {props.coordinate} over time
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[150px] grow basis-0">
                <AutoSizer>
                  {size => (
                    <ReactECharts
                      style={{ width: size.width, height: size.height }}
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
              </CardContent>
              <CardHeader className="pt-0">
                <CardDescription>
                  Number of times the coordinate {props.coordinate} has resolved over time
                </CardDescription>
              </CardHeader>
              <CardContent
                className={cn(
                  'min-h-[150px] grow basis-0',
                  showFieldLevelMetrics ? 'show' : 'hidden',
                )}
              >
                <AutoSizer>
                  {size => (
                    <ReactECharts
                      style={{ width: size.width, height: size.height }}
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
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="bg-neutral-2/50 col-span-4 flex h-full flex-col">
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>
                {props.coordinate} was used by {isLoading ? '-' : totalOperations}{' '}
                {totalOperations > 1 ? 'operations' : 'operation'} in{' '}
                {dateRangeController.selectedPreset.label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[120px] grow basis-0 overflow-y-auto">
              <div className="space-y-2">
                {isLoading
                  ? null
                  : query.data?.target?.schemaCoordinateStats.operations.edges.map(
                      ({ node: operation }) => (
                        <div key={operation.id} className="flex items-center">
                          <p className="truncate text-sm font-medium">
                            <Link
                              className="text-neutral-11 hover:text-neutral-11 hover:underline hover:underline-offset-2"
                              to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                              params={{
                                organizationSlug: props.organizationSlug,
                                projectSlug: props.projectSlug,
                                targetSlug: props.targetSlug,
                                operationName: operation.name,
                                operationHash: operation.operationHash ?? '_',
                              }}
                            >
                              {operation.name}
                            </Link>
                          </p>
                          <div className="ml-auto flex min-w-[150px] flex-row items-center justify-end text-sm font-light">
                            <div>{formatNumber(operation.count)}</div>{' '}
                            <div className="min-w-[70px] text-right">
                              {toDecimal((operation.count * 100) / totalRequests)}%
                            </div>
                          </div>
                        </div>
                      ),
                    )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-2/50 col-span-3 flex h-full flex-col">
            <CardHeader>
              <CardTitle>Clients</CardTitle>
              <CardDescription>
                {props.coordinate} was used by {isLoading ? '-' : totalClients}{' '}
                {totalClients > 1 ? 'clients' : 'client'} in{' '}
                {dateRangeController.selectedPreset.label.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[170px] grow basis-0 overflow-y-auto">
              <div className="space-y-2">
                {isLoading
                  ? null
                  : query.data?.target?.schemaCoordinateStats.clients.edges.map(
                      ({ node: client }) => (
                        <div key={client.name} className="flex items-center">
                          <p className="truncate text-sm font-medium">
                            <Link
                              className="text-neutral-11 hover:text-neutral-11 hover:underline hover:underline-offset-2"
                              to="/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name"
                              params={{
                                organizationSlug: props.organizationSlug,
                                projectSlug: props.projectSlug,
                                targetSlug: props.targetSlug,
                                name: client.name,
                              }}
                            >
                              {client.name}
                            </Link>
                          </p>
                          <div className="ml-auto flex min-w-[150px] flex-row items-center justify-end text-sm font-light">
                            <div>{formatNumber(client.count)}</div>
                            <div className="min-w-[70px] text-right">
                              {toDecimal((client.count * 100) / totalRequests)}%
                            </div>
                          </div>
                        </div>
                      ),
                    )}
              </div>
            </CardContent>
          </Card>

          {showFieldLevelMetrics ? (
            <>
              <Card className="bg-neutral-2/50 col-span-3 flex h-full flex-col">
                <CardHeader>
                  <CardTitle>Errors</CardTitle>
                  <CardDescription>
                    {props.coordinate} resulted in a GraphQL error {isLoading ? '-' : totalFailures}{' '}
                    times in {dateRangeController.selectedPreset.label.toLowerCase()}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[170px] grow basis-0 overflow-y-auto">
                  <div className="space-y-2">
                    {isLoading
                      ? null
                      : query.data?.target?.schemaCoordinateStats.errorCodes?.edges.map(
                          ({ node: error }) => (
                            <div key={error.code} className="flex items-center">
                              <p className="truncate text-sm font-medium">{error.code}</p>
                              <div className="ml-auto flex min-w-[150px] flex-row items-center justify-end text-sm font-light">
                                <div>{formatNumber(error.count)}</div>
                                <div className="min-w-[70px] text-right">
                                  {toDecimal((error.count * 100) / totalRequests)}%
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-neutral-2/50 col-span-4 flex h-full flex-col">
                <CardHeader>
                  <CardTitle>Error Activity</CardTitle>
                  <CardDescription>
                    Error codes returned by {props.coordinate} over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[170px] grow basis-0 overflow-y-auto">
                  <AutoSizer>
                    {size => (
                      <ReactECharts
                        style={{ width: size.width, height: size.height }}
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
                          series: Object.keys(errorCodesOverTime).map((errorCode, i) => ({
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
                            data: errorCodesOverTime[errorCode],
                          })),
                        }}
                      />
                    )}
                  </AutoSizer>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

const TargetSchemaCoordinatePageQuery = graphql(`
  query TargetSchemaCoordinatePageQuery(
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

function TargetSchemaCoordinatePageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  coordinate: string;
}) {
  const [query] = useQuery({
    query: TargetSchemaCoordinatePageQuery,
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

  if (query.data?.hasCollectedOperations === false) {
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
    <SchemaCoordinateView
      coordinate={props.coordinate}
      dataRetentionInDays={currentOrganization.usageRetentionInDays}
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
    />
  );
}

export function TargetInsightsCoordinatePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  coordinate: string;
}) {
  return (
    <>
      <Meta title={`${props.coordinate} - schema coordinate`} />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Insights}
      >
        <TargetSchemaCoordinatePageContent {...props} />
      </TargetLayout>
    </>
  );
}
