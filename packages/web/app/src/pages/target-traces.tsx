import { memo, useCallback, useMemo, useState } from 'react';
import { formatDate, formatISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Clock, ExternalLinkIcon } from 'lucide-react';
import { useClient, useQuery } from 'urql';
import { z } from 'zod';
import { LayoutContent } from '@/components/layouts/layout-content';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { DataTable, type DataTablePaginationProp } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { Filters } from '@/components/ui/filters/filter-menu/filters';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { Button } from '@/components/ui/primitives/button/button';
import { useChartTheme } from '@/components/ui/primitives/chart/chart-theme';
import { TimeSeriesChart } from '@/components/ui/primitives/chart/time-series-chart';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Sheet } from '@/components/ui/primitives/overlays/sheet/sheet';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { QueryError } from '@/components/ui/query-error';
import { RefreshButton } from '@/components/ui/refresh-button/refresh-button';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { formatNumber, usePagedConnection, useSlugs } from '@/lib/hooks';
import { carriedRange, useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { getRouteApi, Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import * as GraphQLSchema from '../gql/graphql';
import { formatNanoseconds, TraceSheet as ImportedTraceSheet } from './target-trace';
import { tracesFilterKeys, withoutTracesFilter, type TracesFilter } from './traces/traces-search';
import { useTracesFilterDimensions } from './traces/use-traces-filter-dimensions';

const tracesRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/traces',
);

const Traffic_TracesStatusBreakdownBucketFragment = graphql(`
  fragment Traffic_TracesStatusBreakdownBucketFragment on TraceStatusBreakdownBucket {
    timeBucketStart
    timeBucketEnd
    okCountTotal
    errorCountTotal
    okCountFiltered
    errorCountFiltered
  }
`);

type TrafficProps = {
  buckets: Array<FragmentType<typeof Traffic_TracesStatusBreakdownBucketFragment>>;
};

const TrafficBucketDiagram = memo(function Traffic(props: TrafficProps) {
  const buckets = useFragment(Traffic_TracesStatusBreakdownBucketFragment, props.buckets);
  const { colors } = useChartTheme();
  const series = useMemo(() => {
    const at = (value: (b: (typeof buckets)[number]) => number) =>
      buckets.map((b): [string, number] => [b.timeBucketStart, value(b)]);
    return [
      { name: 'Ok', data: at(b => b.okCountFiltered), color: colors.primary },
      { name: 'Error', data: at(b => b.errorCountFiltered), color: colors.error },
      {
        name: 'Filtered out',
        data: at(
          b => b.okCountTotal + b.errorCountTotal - b.okCountFiltered - b.errorCountFiltered,
        ),
        color: 'rgba(170,175,180,0.1)',
      },
    ];
  }, [buckets, colors]);

  const navigate = tracesRoute.useNavigate();
  const selectRange = useCallback(
    ({ from, to }: { from: Date; to: Date }) => {
      void navigate({
        search(params) {
          return { ...params, from: from.toISOString(), to: to.toISOString() };
        },
      });
    },
    [navigate],
  );

  return (
    <TimeSeriesChart
      kind="bar"
      stacked
      height={150}
      valueFormatter={formatNumber}
      series={series}
      onRangeSelect={selectRange}
    />
  );
});

const TargetTracesSortShape = z.object({
  desc: z.coerce.boolean(),
  id: z.union([z.literal('timestamp'), z.literal('duration')]),
});

export const TargetTracesSort = {
  shape: TargetTracesSortShape,
};

type SortState = z.infer<typeof TargetTracesSortShape>;
type SortProps = {
  sorting: SortState;
};

export const defaultTracesSort: SortState = { id: 'timestamp', desc: true };

const TracesList_Trace = graphql(`
  fragment TracesList_Trace on Trace {
    id
    timestamp
    operationName
    operationType
    duration
    subgraphs
    success
    clientName
    clientVersion
    httpStatusCode
    httpMethod
    httpHost
    httpRoute
    httpUrl
    operationHash
  }
`);

type TraceRow = DocumentType<typeof TracesList_Trace>;

const TracesList = memo(function TracesList(
  props: SortProps & {
    traces: FragmentType<typeof TracesList_Trace>[];
    onSelectTraceId: (traceId: string) => void;
    selectedTraceId: string | null;
    isFetching: boolean;
    pagination: DataTablePaginationProp;
  },
) {
  const navigate = tracesRoute.useNavigate();
  const data = useFragment(TracesList_Trace, props.traces);

  const { organizationSlug, projectSlug, targetSlug } = tracesRoute.useParams();
  const { from, to } = tracesRoute.useSearch();

  const rows = useMemo(() => [...data], [data]);

  const columns = useMemo<ColumnDef<TraceRow, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Trace ID',
        cell: ({ row }) => (
          <DataTableCell
            kind="link"
            mono
            label={row.original.id.substring(0, 8)}
            link={{
              to: '/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId',
              params: {
                organizationSlug,
                projectSlug,
                targetSlug,
                traceId: row.original.id,
              },
              search: carriedRange({ from, to }),
            }}
          />
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        meta: { sortable: true },
        cell: ({ row }) => {
          const timestamp = row.original.timestamp;
          return (
            <DataTableCell
              kind="text"
              mono
              value={
                <Tooltip
                  side="bottom"
                  trigger={
                    <span className="uppercase">{formatDate(timestamp, 'MMM dd HH:mm:ss')}</span>
                  }
                  content={
                    <div
                      className="min-w-[150px] cursor-auto"
                      onClick={e => {
                        // Prevent the click event from bubbling up to the row,
                        // which would trigger the sheet with trace details to open
                        e.stopPropagation();
                      }}
                    >
                      <DescriptionList
                        rows={[
                          {
                            items: [
                              {
                                term: 'Local',
                                description: formatDate(timestamp, 'MMM dd HH:mm:ss'),
                                mono: true,
                              },
                            ],
                          },
                          {
                            items: [
                              {
                                term: 'UTC',
                                description: formatInTimeZone(timestamp, 'UTC', 'MMM dd HH:mm:ss'),
                                mono: true,
                              },
                            ],
                          },
                          { items: [{ term: 'Unix', description: timestamp, mono: true }] },
                          {
                            items: [
                              {
                                term: 'ISO',
                                description: formatISO(toZonedTime(timestamp, 'UTC')),
                                mono: true,
                              },
                            ],
                          },
                        ]}
                      />
                    </div>
                  }
                />
              }
            />
          );
        },
      },
      {
        accessorKey: 'operationName',
        header: 'Operation Name',
        meta: { width: 'fill' },
        cell: ({ row }) => (
          <DataTableCell
            kind="text"
            value={
              <Tooltip
                side="bottom"
                disableHoverablePopup
                maxWidth="md"
                trigger={
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center rounded-sm bg-surface-card px-1 py-0.5 text-xs text-fg-secondary uppercase">
                      {row.original.operationType?.substring(0, 1).toUpperCase() ?? 'U'}
                    </span>
                    {row.original.operationName ?? (
                      <span className="text-fg-secondary">{'<unknown>'}</span>
                    )}
                  </span>
                }
                content={
                  <div className="min-w-[150px]">
                    <DescriptionList
                      rows={[
                        {
                          items: [
                            { term: 'Name', description: row.original.operationName, mono: true },
                          ],
                        },
                        {
                          items: [
                            { term: 'Kind', description: row.original.operationType, mono: true },
                          ],
                        },
                        {
                          items: [
                            { term: 'Hash', description: row.original.operationHash, mono: true },
                          ],
                        },
                      ]}
                    />
                  </div>
                }
              />
            }
          />
        ),
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        meta: { sortable: true, align: 'right' },
        cell: ({ row }) => (
          <DataTableCell
            kind="text"
            mono
            value={formatNanoseconds(BigInt(row.original.duration))}
          />
        ),
      },
      {
        accessorKey: 'success',
        header: 'Status',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <DataTableCell
            kind="badge"
            items={{
              content: row.original.success ? 'Ok' : 'Error',
              variant: row.original.success ? 'success' : 'critical',
            }}
          />
        ),
      },
      {
        accessorKey: 'subgraphs',
        header: 'Subgraphs',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const subgraphs = row.original.subgraphs ?? [];
          return (
            <DataTableCell
              kind="text"
              mono
              value={
                <Tooltip
                  side="bottom"
                  disableHoverablePopup
                  trigger={<span>{subgraphs.length}</span>}
                  content={
                    <div className="min-w-[150px]">
                      <DescriptionList
                        rows={[
                          {
                            items: [
                              {
                                term: 'Subgraphs',
                                description: subgraphs.length ? subgraphs.join(', ') : '<none>',
                                mono: true,
                              },
                            ],
                          },
                        ]}
                      />
                    </div>
                  }
                />
              }
            />
          );
        },
      },
      {
        accessorKey: 'httpMethod',
        header: 'HTTP Method',
        meta: { align: 'center' },
        cell: ({ row }) => <DataTableCell kind="text" mono value={row.original.httpMethod} />,
      },
      {
        accessorKey: 'httpStatusCode',
        header: 'HTTP Status',
        meta: { align: 'center' },
        cell: ({ row }) => <DataTableCell kind="text" mono value={row.original.httpStatusCode} />,
      },
    ],
    [organizationSlug, projectSlug, targetSlug, from, to],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={trace => trace.id}
      loading={props.isFetching && props.traces.length === 0}
      emptyMessage="No results."
      sorting={{
        state: [props.sorting],
        manual: true,
        onChange: updater => {
          const [next] = typeof updater === 'function' ? updater([props.sorting]) : updater;
          if (!next) {
            return;
          }
          void navigate({
            search(params) {
              return { ...params, sort: next as SortState };
            },
          });
        },
      }}
      selectedRowId={props.selectedTraceId ?? undefined}
      onRowClick={trace => props.onSelectTraceId(trace.id)}
      hideRowIndicator
      pagination={props.pagination}
    />
  );
});

type FilterProps = {
  filter: TracesFilter;
};

type SelectedTraceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null until a trace has been selected. */
  traceId: string | null;
};

const SelectedTraceSheetQuery = graphql(`
  query SelectedTraceSheetQuery($targetSelector: TargetSelectorInput!, $traceId: ID!) {
    target(reference: { bySelector: $targetSelector }) {
      id
      trace(traceId: $traceId) {
        ...TraceSheet_TraceFragment
        id
        operationName
        duration
        success
        timestamp
      }
    }
  }
`);

function SelectedTraceSheet(props: SelectedTraceSheetProps) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [queryResult] = useQuery({
    query: SelectedTraceSheetQuery,
    variables: {
      targetSelector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
      traceId: props.traceId ?? '',
    },
    pause: !props.traceId,
  });

  const trace = queryResult.data?.target?.trace;

  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      width="half"
      padding="none"
      title={
        trace ? (
          <>
            {trace.operationName ?? <span className="text-fg-secondary">{'<unknown>'}</span>}
            <span className="ml-2 font-mono font-normal text-fg-secondary">
              {trace.id.substring(0, 4)}
            </span>
          </>
        ) : (
          <span className="inline-flex w-[260px] align-middle">
            <Skeleton variants={{ size: 'lg', width: 'full' }} />
          </span>
        )
      }
      description={
        <>
          Trace ID:{' '}
          {trace?.id ? (
            <>
              <span className="font-mono"> {trace.id}</span>
              <CopyIconButton value={trace.id} label="Copy Trace ID" />
            </>
          ) : (
            <span className="inline-flex w-[200px] align-middle">
              <Skeleton variants={{ width: 'full' }} />
            </span>
          )}
        </>
      }
    >
      <div className="flex items-center gap-3 border-b border-line px-6 pb-4 text-xs">
        {trace ? (
          <>
            <div className="flex items-center gap-1">
              <Clock className="size-3 text-fg-secondary" />
              <span className="text-fg-default">{formatNanoseconds(BigInt(trace.duration))}</span>
            </div>
            <Badge
              content={trace.success ? 'Ok' : 'Error'}
              variants={{ variant: trace.success ? 'success' : 'critical' }}
            />
            <span className="font-mono text-fg-default uppercase">
              {formatDate(trace.timestamp, 'MMM dd HH:mm:ss')}
            </span>
          </>
        ) : (
          <span className="inline-flex w-[150px] align-middle">
            <Skeleton variants={{ width: 'full' }} />
          </span>
        )}
        {props.traceId ? (
          <div className="ml-auto">
            <Button
              variant="outline"
              size="compact"
              render={
                <Link
                  to="/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId"
                  params={{
                    organizationSlug,
                    projectSlug,
                    targetSlug,
                    traceId: props.traceId,
                  }}
                />
              }
            >
              <ExternalLinkIcon className="mr-1 size-3" />
              Full Trace
            </Button>
          </div>
        ) : null}
      </div>
      {trace && <ImportedTraceSheet activeSpanId={null} activeSpanTab={null} trace={trace} />}
    </Sheet>
  );
}

export const TargetTracesPageQuery = graphql(`
  query TargetTracesPageQuery(
    $targetRef: TargetSelectorInput!
    $first: Int!
    $filter: TracesFilterInput
    $sort: TracesSortInput
  ) {
    target(reference: { bySelector: $targetRef }) {
      id
      traces(first: $first, filter: $filter, sort: $sort) {
        edges {
          node {
            ...TracesList_Trace
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      tracesStatusBreakdown(filter: $filter) {
        ...Traffic_TracesStatusBreakdownBucketFragment
      }
    }
  }
`);

const TargetTracesFetchMoreTracesQuery = graphql(`
  query TargetTracesFetchMoreTracesQuery(
    $targetRef: TargetSelectorInput!
    $first: Int!
    $filter: TracesFilterInput
    $sort: TracesSortInput
    $after: String!
  ) {
    target(reference: { bySelector: $targetRef }) {
      id
      traces(first: $first, filter: $filter, sort: $sort, after: $after) {
        edges {
          node {
            ...TracesList_Trace
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

const TRACES_PAGE_SIZE = 50;

const operationTypes = {
  query: GraphQLSchema.GraphQlOperationType.Query,
  mutation: GraphQLSchema.GraphQlOperationType.Mutation,
  subscription: GraphQLSchema.GraphQlOperationType.Subscription,
  unknown: null,
} as const;

export function tracesPageVariables(
  slugs: { organizationSlug: string; projectSlug: string; targetSlug: string },
  filter: TracesFilter,
  sorting: SortState,
  period: { from: string; to: string },
) {
  return {
    targetRef: slugs,
    filter: {
      period,
      duration: {
        min: filter.durationMin ?? null,
        max: filter.durationMax ?? null,
      },
      traceIds: filter.traceIds ?? [],
      success: filter.status ? [filter.status === 'ok'] : [],
      errorCodes: filter.errorCodes ?? [],
      operationNames: filter.operationNames ?? [],
      operationTypes: (filter.operationTypes ?? []).map(type => operationTypes[type]),
      clientNames: filter.clientNames ?? [],
      subgraphNames: filter.subgraphNames ?? [],
      httpStatusCodes: filter.httpStatusCodes ?? [],
      httpMethods: filter.httpMethods ?? [],
      httpHosts: filter.httpHosts ?? [],
      httpRoutes: filter.httpRoutes ?? [],
      httpUrls: filter.httpUrls ?? [],
    } satisfies GraphQLSchema.TracesFilterInput,
    first: TRACES_PAGE_SIZE,
    sort: {
      sort:
        sorting.id === 'duration'
          ? GraphQLSchema.TracesSortType.Duration
          : GraphQLSchema.TracesSortType.Timestamp,
      direction: sorting.desc
        ? GraphQLSchema.SortDirectionType.Desc
        : GraphQLSchema.SortDirectionType.Asc,
    },
  };
}

export const TargetTracesFilterValuesQuery = graphql(`
  query TargetTracesFilterValuesQuery($targetRef: TargetSelectorInput!, $period: DateRangeInput!) {
    target(reference: { bySelector: $targetRef }) {
      id
      tracesFilterValues(period: $period) {
        operationNames {
          values
          truncated
        }
        clientNames {
          values
          truncated
        }
        subgraphNames {
          values
          truncated
        }
        errorCodes {
          values
          truncated
        }
        httpStatusCodes {
          values
          truncated
        }
        httpMethods {
          values
          truncated
        }
        httpHosts {
          values
          truncated
        }
        httpRoutes {
          values
          truncated
        }
        httpUrls {
          values
          truncated
        }
      }
    }
  }
`);

export function TargetTracesPage(props: SortProps & FilterProps) {
  return (
    <>
      <Meta title="Traces" />
      <LayoutContent>
        <TargetTracesPageContent {...props} />
      </LayoutContent>
    </>
  );
}

function TargetTracesPageContent(props: SortProps & FilterProps) {
  const { organizationSlug, projectSlug, targetSlug } = tracesRoute.useParams();
  // Resolved by the route loader, so the list and the loader share one clock.
  const { period } = tracesRoute.useLoaderData();

  const dateRangeController = useDateRangeController({
    // TODO: ressolve retention from account
    dataRetentionInDays: 365,
    defaultPreset: presetLast7Days,
  });

  const variables = tracesPageVariables(
    { organizationSlug, projectSlug, targetSlug },
    props.filter,
    props.sorting,
    period,
  );
  const urql = useClient();
  const [query] = useQuery({ query: TargetTracesPageQuery, variables });

  const connection = query.data?.target?.traces;
  const { rows: traces, pagination } = usePagedConnection({
    edges: connection?.edges.map(edge => edge.node) ?? [],
    pageInfo: connection?.pageInfo ?? { hasNextPage: false },
    pageSize: TRACES_PAGE_SIZE,
    loadMore: after =>
      urql
        .query(TargetTracesFetchMoreTracesQuery, {
          targetRef: variables.targetRef,
          filter: variables.filter,
          first: TRACES_PAGE_SIZE,
          sort: variables.sort,
          after,
        })
        .toPromise(),
  });

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  // The last trace stays up through the sheet's close transition.
  const sheetTraceId =
    useKeepPreviousData(selectedTraceId ?? undefined, selectedTraceId === null) ?? null;

  const navigate = tracesRoute.useNavigate();
  // Keyed by target and period only, so changing a filter is a cache hit.
  const [valuesQuery] = useQuery({
    query: TargetTracesFilterValuesQuery,
    variables: { targetRef: variables.targetRef, period },
  });
  const dimensions = useTracesFilterDimensions({
    search: props.filter,
    navigate,
    values: valuesQuery.data?.target?.tracesFilterValues,
  });
  const hasFilters = tracesFilterKeys.some(key => props.filter[key] !== undefined);

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const isLoading = query.stale || query.fetching;

  return (
    <div className="py-6">
      <SubPageLayoutHeader
        subPageTitle="Traces"
        description="Insights into the requests made to your GraphQL API."
      />
      <div className="mt-4 flex items-start justify-between gap-4">
        <Filters
          dimensions={dimensions}
          pinnedControls={
            <DateRangePicker
              size="compact"
              selectedRange={dateRangeController.selectedPreset.range}
              startDate={dateRangeController.startDate}
              align="start"
              onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
            />
          }
          afterChips={
            hasFilters ? (
              <Button
                label="Clear filters"
                variant="ghost"
                size="compact"
                onClick={() => void navigate({ search: prev => withoutTracesFilter(prev) })}
              />
            ) : null
          }
        />
        <RefreshButton
          size="compact"
          onClick={() => dateRangeController.refreshResolvedRange()}
          disabled={isLoading}
        />
      </div>
      <main className="mt-4 flex min-h-svh flex-col gap-4">
        <TrafficBucketDiagram buckets={query.data?.target?.tracesStatusBreakdown ?? []} />
        <TracesList
          sorting={props.sorting}
          traces={traces}
          onSelectTraceId={setSelectedTraceId}
          selectedTraceId={selectedTraceId}
          isFetching={query.fetching}
          pagination={pagination}
        />
      </main>
      <SelectedTraceSheet
        open={selectedTraceId !== null}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setSelectedTraceId(null);
          }
        }}
        traceId={sheetTraceId}
      />
    </div>
  );
}
