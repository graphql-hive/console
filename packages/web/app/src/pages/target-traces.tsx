import { memo, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { formatDate, formatISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Clock, ExternalLinkIcon, XIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { getRouteApi, Link, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import * as GraphQLSchema from '../gql/graphql';
import { formatNanoseconds, TraceSheet as ImportedTraceSheet } from './target-trace';
import { DurationFilter, MultiInputFilter, MultiSelectFilter } from './traces/target-traces-filter';
import {
  flattenLegacyTracesFilter,
  TRACES_DURATION_BOUNDS,
  tracesFilterKeys,
  withoutTracesFilter,
  type LegacyTracesFilter,
  type TracesFilter,
} from './traces/traces-search';
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

  return (
    <TimeSeriesChart
      kind="bar"
      stacked
      height={150}
      valueFormatter={formatNumber}
      series={series}
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

function LabelWithColor(props: { className: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-x-2">
      <div className={cn('h-[11px] w-[2px] rounded-xs', props.className)} />
      <div>{props.children}</div>
    </div>
  );
}

type FilterState = Required<LegacyTracesFilter>;

/** The sidebar still reads the old nested shape; this builds it from the flat params. */
function toSidebarFilter(filter: TracesFilter): FilterState {
  const hasDuration = filter.durationMin !== undefined || filter.durationMax !== undefined;
  return {
    duration: hasDuration
      ? [
          filter.durationMin ?? TRACES_DURATION_BOUNDS.min,
          filter.durationMax ?? TRACES_DURATION_BOUNDS.max,
        ]
      : [],
    'trace.id': filter.traceIds ?? [],
    'graphql.status': filter.status ? [filter.status] : [],
    'graphql.kind': (filter.operationTypes ?? []).map(type =>
      type === 'unknown' ? null : type.toUpperCase(),
    ),
    'graphql.subgraph': filter.subgraphNames ?? [],
    'graphql.operation': filter.operationNames ?? [],
    'graphql.client': filter.clientNames ?? [],
    'graphql.errorCode': filter.errorCodes ?? [],
    'http.status': filter.httpStatusCodes ?? [],
    'http.method': filter.httpMethods ?? [],
    'http.host': filter.httpHosts ?? [],
    'http.route': filter.httpRoutes ?? [],
    'http.url': filter.httpUrls ?? [],
  };
}

type FilterProps = {
  filter: TracesFilter;
};

type FilterKeys = keyof FilterState;

type FilterOptions = {
  [key: string]: Array<{
    value: string | null;
    searchContent: string;
    label: ReactNode;
    count: number;
  }>;
};

function SidebarFilters(
  props: FilterProps & {
    options: FilterOptions;
  },
) {
  const filters = useMemo(() => toSidebarFilter(props.filter), [props.filter]);
  const filterOptions = props.options;

  // Stores the update handlers in a ref to prevent unnecessary re-renders
  const router = useRouter();
  const navigate = tracesRoute.useNavigate();
  const updateHandlersRef = useRef(new Map<FilterKeys, (value: any) => void>());
  const updateFilter = useCallback(
    <$Key extends FilterKeys>(key: $Key): ((value: FilterState[$Key]) => void) => {
      if (!updateHandlersRef.current.has(key)) {
        const handler = (value: FilterState[$Key]) => {
          void navigate({
            search(params) {
              return {
                ...withoutTracesFilter(params),
                ...flattenLegacyTracesFilter({ ...toSidebarFilter(params), [key]: value }),
              };
            },
          });
        };
        updateHandlersRef.current.set(key, handler);
      }
      return updateHandlersRef.current.get(key)!;
    },
    [router],
  );

  const resetFilters = () => {
    void navigate({
      search: params => withoutTracesFilter(params),
    });
  };

  const filterSelector = <$Key extends FilterKeys>(key: $Key) => filters[key];

  const hasChanges = useMemo(() => {
    for (const key in filters) {
      const filterName = key as FilterKeys;

      if (filterName === 'duration') {
        if (
          filters[filterName].length === 2 &&
          (filters[filterName][0] !== 0 || filters[filterName][1] !== 100_000)
        ) {
          return true;
        }
        continue;
      }

      if (filters[filterName].length > 0) {
        return true;
      }
    }
  }, [filters]);

  return (
    <>
      <div className="flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium text-fg">
        <div>Filters</div>
        {hasChanges ? (
          <Button variant="ghost" size="icon-sm" onClick={resetFilters}>
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>
      <DurationFilter value={filterSelector('duration')} onChange={updateFilter('duration')} />
      <MultiInputFilter
        key="trace.id"
        name="Trace ID"
        selectedValues={filterSelector('trace.id')}
        onChange={updateFilter('trace.id')}
      />
      <MultiSelectFilter
        key="graphql.status"
        name="Status"
        options={filterOptions['graphql.status'].map(option => ({
          ...option,
          label: (
            <LabelWithColor className={option.value === 'ok' ? 'bg-success' : 'bg-critical'}>
              {option.label}
            </LabelWithColor>
          ),
        }))}
        selectedValues={filterSelector('graphql.status')}
        onChange={updateFilter('graphql.status')}
        hideSearch
      />
      <MultiSelectFilter
        key="graphql.errorCode"
        name="Error Code"
        options={filterOptions['graphql.errorCode'].map(option => ({
          ...option,
          label: <LabelWithColor className="bg-critical">{option.label}</LabelWithColor>,
        }))}
        selectedValues={filterSelector('graphql.errorCode')}
        onChange={updateFilter('graphql.errorCode')}
        hideSearch
      />
      <MultiSelectFilter
        key="graphql.kind"
        name="Operation Kind"
        options={filterOptions['graphql.kind']}
        selectedValues={filterSelector('graphql.kind')}
        onChange={updateFilter('graphql.kind')}
        hideSearch
      />
      <MultiSelectFilter
        key="graphql.subgraph"
        name="Subgraph Name"
        options={filterOptions['graphql.subgraph']}
        selectedValues={filterSelector('graphql.subgraph')}
        onChange={updateFilter('graphql.subgraph')}
      />
      <MultiSelectFilter
        key="graphql.name"
        name="Operation Name"
        options={filterOptions['graphql.name']}
        selectedValues={filterSelector('graphql.operation')}
        onChange={updateFilter('graphql.operation')}
      />
      <MultiSelectFilter
        key="graphql.client"
        name="Client"
        options={filterOptions['graphql.client']}
        selectedValues={filterSelector('graphql.client')}
        onChange={updateFilter('graphql.client')}
      />
      <MultiSelectFilter
        key="http.status"
        name="HTTP Status Code"
        options={filterOptions['http.status']}
        selectedValues={filterSelector('http.status')}
        onChange={updateFilter('http.status')}
        hideSearch
      />
      <MultiSelectFilter
        key="http.method"
        name="HTTP Method"
        options={filterOptions['http.method']}
        selectedValues={filterSelector('http.method')}
        onChange={updateFilter('http.method')}
        hideSearch
      />
      <MultiSelectFilter
        key="http.host"
        name="HTTP Host"
        options={filterOptions['http.host']}
        selectedValues={filterSelector('http.host')}
        onChange={updateFilter('http.host')}
      />
      <MultiSelectFilter
        key="http.route"
        name="HTTP Route"
        options={filterOptions['http.route']}
        selectedValues={filterSelector('http.route')}
        onChange={updateFilter('http.route')}
      />
      <MultiSelectFilter
        key="http.url"
        name="HTTP URL"
        options={filterOptions['http.url']}
        selectedValues={filterSelector('http.url')}
        onChange={updateFilter('http.url')}
      />
    </>
  );
}

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
