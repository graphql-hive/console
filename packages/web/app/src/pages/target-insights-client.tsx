import { useMemo } from 'react';
import { differenceInMilliseconds } from 'date-fns';
import { ActivityIcon, BookIcon, GlobeIcon, HistoryIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { RetentionNote } from '@/components/organization/billing/retention-note';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Card } from '@/components/ui/primitives/card/card';
import { TimeSeriesChart } from '@/components/ui/primitives/chart/time-series-chart';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { QueryError } from '@/components/ui/query-error';
import { RefreshButton } from '@/components/ui/refresh-button/refresh-button';
import { StatCard } from '@/components/ui/stat-card/stat-card';
import { graphql } from '@/gql';
import { formatNumber, formatThroughput, toDecimal, useSlugs } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { pick } from '@/lib/object';
import { getRouteApi, Link } from '@tanstack/react-router';

const clientRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name',
);

export const ClientView_ClientStatsQuery = graphql(`
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

function ClientView(props: { clientName: string; dataRetentionInDays: number }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const dateRangeController = useDateRangeController({
    dataRetentionInDays: props.dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });
  // Resolved by the route loader, so both sides ask for one period.
  const { period, resolution } = clientRoute.useLoaderData();

  const [query] = useQuery({
    query: ClientView_ClientStatsQuery,
    variables: {
      targetSelector: { organizationSlug, projectSlug, targetSlug },
      period,
      clientName: props.clientName,
      resolution,
    },
  });

  const isLoading = query.fetching;
  const points = query.data?.target?.clientStats?.requestsOverTime;
  const requestsOverTime = useMemo(() => {
    if (!points) {
      return [];
    }

    return points.map<[string, number]>(node => [node.date, node.value]);
  }, [points]);

  const totalRequests = query.data?.target?.clientStats?.totalRequests ?? 0;
  const totalVersions = query.data?.target?.clientStats?.totalVersions ?? 0;
  const totalOperations = query.data?.target?.clientStats?.operations.edges.length ?? 0;

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
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
      <div className="space-y-4 pb-8">
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-8">
          <div className="col-span-4">
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-2">
              <StatCard
                title="Total calls"
                icon={GlobeIcon}
                value={isLoading ? '-' : formatNumber(totalRequests)}
                caption={`Requests in ${dateRangeController.selectedPreset.label.toLowerCase()}`}
              />
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
                caption="Documents requested by selected client"
              />
              <StatCard
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
              <TimeSeriesChart
                kind="area"
                valueFormatter={formatNumber}
                series={[{ name: 'Requests', data: requestsOverTime }]}
              />
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
              <ScrollArea maxHeight="lg">
                {isLoading
                  ? null
                  : query.data?.target?.clientStats.operations.edges.map(({ node: operation }) => (
                      <Link
                        key={operation.id}
                        className="flex items-center rounded-md px-2 py-1 text-fg-default hover:bg-surface-hover hover:text-fg-default hover:underline hover:underline-offset-2"
                        to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                        params={{
                          organizationSlug,
                          projectSlug,
                          targetSlug,
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
              </ScrollArea>
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
              <ScrollArea maxHeight="lg">
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
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export const ClientInsightsPageQuery = graphql(`
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

function ClientInsightsPageContent(props: { name: string }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: ClientInsightsPageQuery,
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
    />
  );
}

export function TargetInsightsClientPage(props: { name: string }) {
  return (
    <>
      <Meta title={`${props.name} - client`} />
      <LayoutContent>
        <ClientInsightsPageContent name={props.name} />
      </LayoutContent>
    </>
  );
}
