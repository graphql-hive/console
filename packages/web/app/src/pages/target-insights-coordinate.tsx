import { useMemo } from 'react';
import { differenceInMilliseconds } from 'date-fns';
import {
  ActivityIcon,
  AlertCircleIcon,
  BookIcon,
  GlobeIcon,
  TabletSmartphoneIcon,
} from 'lucide-react';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { RetentionNote } from '@/components/organization/billing/retention-note';
import { SupergraphMetadataList } from '@/components/target/explorer/super-graph-metadata';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { EmptyList } from '@/components/ui/empty-list';
import { Link as LegacyLink } from '@/components/ui/link';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Card } from '@/components/ui/primitives/card/card';
import { useChartTheme } from '@/components/ui/primitives/chart/chart-theme';
import { TimeSeriesChart } from '@/components/ui/primitives/chart/time-series-chart';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { QueryError } from '@/components/ui/query-error';
import { RefreshButton } from '@/components/ui/refresh-button/refresh-button';
import { StatCard } from '@/components/ui/stat-card/stat-card';
import { graphql } from '@/gql';
import { FieldLevelMetricsDisplayState } from '@/gql/graphql';
import { formatNumber, formatThroughput, toDecimal, useSlugs } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { stringToHiveColor } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { getRouteApi, Link } from '@tanstack/react-router';
import { targetInsightsCoordinateStyles } from './target-insights-coordinate.css';

const coordinateRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate',
);

// The type a coordinate belongs to, as the stats query wants it beside the coordinate.
export function coordinateType(coordinate: string) {
  return coordinate.split('.')[0];
}

export const SchemaCoordinateView_SchemaCoordinateStatsQuery = graphql(`
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

function SchemaCoordinateView(props: { coordinate: string; dataRetentionInDays: number }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { colors } = useChartTheme();
  const errorColors = [colors.error, colors.p99, colors.p95, colors.p90, colors.p75];
  const dateRangeController = useDateRangeController({
    dataRetentionInDays: props.dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });
  // Resolved by the route loader, so both sides ask for one period.
  const { period, resolution } = coordinateRoute.useLoaderData();
  const typeName = coordinateType(props.coordinate);

  const [query] = useQuery({
    query: SchemaCoordinateView_SchemaCoordinateStatsQuery,
    variables: {
      targetSelector: { organizationSlug, projectSlug, targetSlug },
      type: typeName,
      schemaCoordinate: props.coordinate,
      period,
      resolution,
    },
  });

  const isLoading = query.fetching;
  const points = query.data?.target?.schemaCoordinateStats?.requestsOverTime;
  const requestsOverTime = useMemo(() => {
    if (!points) {
      return [];
    }

    return points.map<[string, number]>(node => [node.date, node.value]);
  }, [points]);

  const resolutionPoints = query.data?.target?.schemaCoordinateStats?.resolutionsOverTime;
  const resolutionsOverTime = useMemo(() => {
    if (!resolutionPoints) {
      return [];
    }

    return resolutionPoints.map<[string, number]>(node => [node.date, node.value]);
  }, [resolutionPoints]);

  const errorPoints = query.data?.target?.schemaCoordinateStats?.failuresOverTime;
  const errorsOverTime = useMemo(() => {
    if (!errorPoints) {
      return [];
    }

    return errorPoints.map<[string, number]>(node => [node.date, node.value]);
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
    (fieldLevelMetricsDisplayState === FieldLevelMetricsDisplayState.On ||
      fieldLevelMetricsDisplayState === FieldLevelMetricsDisplayState.OnWithWarning) &&
    kind !== 'GraphQLInputObjectType';

  if (query.error) {
    return <QueryError organizationSlug={organizationSlug} error={query.error} />;
  }

  return (
    <>
      <div className={targetInsightsCoordinateStyles.header}>
        <div>
          <div className={targetInsightsCoordinateStyles.headerTitle}>
            <Title className={targetInsightsCoordinateStyles.title}>{title}</Title>
            {supergraphMetadata ? (
              <SupergraphMetadataList
                supergraphMetadata={supergraphMetadata}
                previewThreshold={5}
              />
            ) : null}
          </div>
          <Subtitle>Schema coordinate insights</Subtitle>
        </div>
        <div className={targetInsightsCoordinateStyles.headerActions}>
          <DateRangePicker
            selectedRange={dateRangeController.selectedPreset.range}
            startDate={dateRangeController.startDate}
            align="end"
            onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
            footer={
              <RetentionNote
                retentionInDays={dateRangeController.retentionInDays}
                subject={dateRangeController.subject}
              />
            }
          />
          <RefreshButton onClick={() => dateRangeController.refreshResolvedRange()} />
        </div>
      </div>
      {query.data?.target?.hasCollectedSubscriptionOperations && (
        <div className={targetInsightsCoordinateStyles.notice}>
          <Alert>
            <AlertCircleIcon className={targetInsightsCoordinateStyles.noticeIcon} />
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
        <div className={targetInsightsCoordinateStyles.notice}>
          <Alert className={targetInsightsCoordinateStyles.infoAlert}>
            <AlertCircleIcon className={targetInsightsCoordinateStyles.noticeIcon} />
            <AlertTitle>Coordinate resolutions were recently added.</AlertTitle>
            <AlertDescription>
              Your gateway was recently upgraded to add usage tracking for actual coordinate
              resolutions and errors. Please disregard the missing historic resolution data, as this
              data cannot be backfilled.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <div className={targetInsightsCoordinateStyles.sections}>
        <div className={targetInsightsCoordinateStyles.statsRow}>
          <div className={targetInsightsCoordinateStyles.statsHalf}>
            <div className={targetInsightsCoordinateStyles.stats}>
              <StatCard
                title="Total calls"
                icon={GlobeIcon}
                value={isLoading ? '-' : formatNumber(totalRequests)}
                caption={`Requests in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
              />
              {showFieldLevelMetrics ? (
                <StatCard
                  title="Total resolutions"
                  icon={GlobeIcon}
                  hint={
                    <>
                      <p className={targetInsightsCoordinateStyles.statNote}>
                        Resolution Count is the total number of times this specific field (schema
                        coordinate) was executed and returned.
                      </p>
                      <p>
                        This differs from Request Count because a single request can resolve a field
                        multiple times (e.g., inside an array) or skip it entirely (due to errors or
                        conditional directives).
                      </p>
                    </>
                  }
                  value={
                    <>
                      {isLoading ? '-' : formatNumber(totalResolutions)}
                      {totalFailures ? (
                        <span className={targetInsightsCoordinateStyles.statWarning}>
                          ({formatNumber(totalFailures)} errors)
                        </span>
                      ) : null}
                    </>
                  }
                  caption={`Resolved in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
                />
              ) : null}
              <StatCard
                title="Requests per minute"
                icon={ActivityIcon}
                value={
                  isLoading
                    ? '-'
                    : formatThroughput(
                        totalRequests,
                        differenceInMilliseconds(new Date(period.to), new Date(period.from)),
                      )
                }
                caption={`RPM in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
              />
              <StatCard
                title="Operations"
                icon={BookIcon}
                value={isLoading ? '-' : totalOperations}
                caption="GraphQL documents with selected coordinate"
              />
              <StatCard
                title="Consumers"
                icon={TabletSmartphoneIcon}
                value={isLoading ? '-' : totalClients}
                caption={`GraphQL clients in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
              />
            </div>
          </div>
          <div className={targetInsightsCoordinateStyles.statsHalf}>
            <Card
              variants={{ onSurface: 'raised', titleSize: 'large' }}
              title="Activity"
              description={<>GraphQL requests with {props.coordinate} over time</>}
            >
              <TimeSeriesChart
                kind="area"
                valueFormatter={formatNumber}
                series={[{ name: 'Requests', data: requestsOverTime }]}
              />
              <div
                className={targetInsightsCoordinateStyles.fieldMetrics({
                  hidden: !showFieldLevelMetrics,
                })}
              >
                <p className={targetInsightsCoordinateStyles.fieldMetricsNote}>
                  Number of times the coordinate {props.coordinate} has resolved over time
                </p>
                <TimeSeriesChart
                  kind="area"
                  valueFormatter={formatNumber}
                  series={[
                    ...(resolutionsOverTime.length
                      ? [{ name: 'Resolutions', data: resolutionsOverTime, color: colors.primary }]
                      : []),
                    ...(errorsOverTime.length
                      ? [{ name: 'Errors', data: errorsOverTime, color: colors.error }]
                      : []),
                  ]}
                />
              </div>
            </Card>
          </div>
        </div>
        <div className={targetInsightsCoordinateStyles.listsRow}>
          <div className={targetInsightsCoordinateStyles.operations}>
            <Card
              variants={{ onSurface: 'raised', titleSize: 'large' }}
              title="Operations"
              description={
                <>
                  {props.coordinate} was used by {isLoading ? '-' : totalOperations}{' '}
                  {totalOperations > 1 ? 'operations' : 'operation'} in{' '}
                  {dateRangeController.selectedPreset.label.toLowerCase()}
                </>
              }
            >
              <ScrollArea maxHeight="lg">
                {isLoading
                  ? null
                  : query.data?.target?.schemaCoordinateStats.operations.edges.map(
                      ({ node: operation }) => (
                        <Link
                          key={operation.id}
                          className={targetInsightsCoordinateStyles.listLink}
                          to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                          params={{
                            organizationSlug,
                            projectSlug,
                            targetSlug,
                            operationName: operation.name,
                            operationHash: operation.operationHash ?? '_',
                          }}
                        >
                          <p className={targetInsightsCoordinateStyles.name}>{operation.name}</p>
                          <div className={targetInsightsCoordinateStyles.figures}>
                            <div>{formatNumber(operation.count)}</div>{' '}
                            <div className={targetInsightsCoordinateStyles.figure}>
                              {toDecimal((operation.count * 100) / totalRequests)}%
                            </div>
                          </div>
                        </Link>
                      ),
                    )}
              </ScrollArea>
            </Card>
          </div>

          <div className={targetInsightsCoordinateStyles.clients}>
            <Card
              variants={{ onSurface: 'raised', titleSize: 'large' }}
              title="Clients"
              description={
                <>
                  {props.coordinate} was used by {isLoading ? '-' : totalClients}{' '}
                  {totalClients > 1 ? 'clients' : 'client'} in{' '}
                  {dateRangeController.selectedPreset.label.toLowerCase()}.
                </>
              }
            >
              <ScrollArea maxHeight="lg">
                {isLoading
                  ? null
                  : query.data?.target?.schemaCoordinateStats.clients.edges.map(
                      ({ node: client }) => (
                        <Link
                          key={client.name}
                          className={targetInsightsCoordinateStyles.listLink}
                          to="/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name"
                          params={{
                            organizationSlug,
                            projectSlug,
                            targetSlug,
                            name: client.name,
                          }}
                        >
                          <p className={targetInsightsCoordinateStyles.name}>{client.name}</p>
                          <div className={targetInsightsCoordinateStyles.figures}>
                            <div>{formatNumber(client.count)}</div>
                            <div className={targetInsightsCoordinateStyles.figure}>
                              {toDecimal((client.count * 100) / totalRequests)}%
                            </div>
                          </div>
                        </Link>
                      ),
                    )}
              </ScrollArea>
            </Card>
          </div>

          {showFieldLevelMetrics ? (
            <>
              <div className={targetInsightsCoordinateStyles.clients}>
                <Card
                  variants={{ onSurface: 'raised', titleSize: 'large' }}
                  title="Errors"
                  description={
                    <>
                      {props.coordinate} resulted in a GraphQL error{' '}
                      {isLoading ? '-' : totalFailures} times in{' '}
                      {dateRangeController.selectedPreset.label.toLowerCase()}.
                    </>
                  }
                >
                  <ScrollArea maxHeight="lg">
                    <div className={targetInsightsCoordinateStyles.errors}>
                      {isLoading
                        ? null
                        : query.data?.target?.schemaCoordinateStats.errorCodes?.edges.map(
                            ({ node: error }) => (
                              <div key={error.code} className={shared.row.base}>
                                <p className={targetInsightsCoordinateStyles.name}>{error.code}</p>
                                <div className={targetInsightsCoordinateStyles.figures}>
                                  <div>{formatNumber(error.count)}</div>
                                  <div className={targetInsightsCoordinateStyles.figure}>
                                    {toDecimal((error.count * 100) / totalRequests)}%
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
              <div className={targetInsightsCoordinateStyles.operations}>
                <Card
                  variants={{ onSurface: 'raised', titleSize: 'large' }}
                  title="Error Activity"
                  description={<>Error codes returned by {props.coordinate} over time</>}
                >
                  <TimeSeriesChart
                    kind="bar"
                    valueFormatter={formatNumber}
                    series={Object.keys(errorCodesOverTime).map((errorCode, i) => ({
                      name: errorCode,
                      data: errorCodesOverTime[errorCode],
                      color: i < 5 ? errorColors[i] : stringToHiveColor(errorCode),
                    }))}
                  />
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

export const TargetSchemaCoordinatePageQuery = graphql(`
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

function TargetSchemaCoordinatePageContent(props: { coordinate: string }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: TargetSchemaCoordinatePageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
    },
  });

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
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
      <div className={targetInsightsCoordinateStyles.pending}>
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
    />
  );
}

export function TargetInsightsCoordinatePage(props: { coordinate: string }) {
  return (
    <>
      <Meta title={`${props.coordinate} - schema coordinate`} />
      <LayoutContent>
        <TargetSchemaCoordinatePageContent coordinate={props.coordinate} />
      </LayoutContent>
    </>
  );
}
