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

const TargetTracesSortShape = z
  .object({
    desc: z.coerce.boolean(),
    id: z.union([z.literal('timestamp'), z.literal('duration')]),
  })
  .default({
    desc: true,
    id: 'timestamp',
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
                    <span className="bg-surface-card text-fg-secondary inline-flex items-center rounded-sm px-1 py-0.5 text-xs uppercase">
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
      <div className={cn('rounded-xs h-[11px] w-[2px]', props.className)} />
      <div>{props.children}</div>
    </div>
  );
}

export const TargetTracesFilterState = z.object({
  duration: z.union([z.tuple([z.number(), z.number()]), z.tuple([])]).default([]),
  'trace.id': z.array(z.string()).default([]),
  'graphql.status': z.array(z.string()).default([]),
  'graphql.kind': z.array(z.string().nullable()).default([]),
  'graphql.subgraph': z.array(z.string()).default([]),
  'graphql.operation': z.array(z.string()).default([]),
  'graphql.client': z.array(z.string()).default([]),
  'graphql.errorCode': z.array(z.string()).default([]),
  'http.status': z.array(z.string()).default([]),
  'http.method': z.array(z.string()).default([]),
  'http.host': z.array(z.string()).default([]),
  'http.route': z.array(z.string()).default([]),
  'http.url': z.array(z.string()).default([]),
});

export type FilterState = z.infer<typeof TargetTracesFilterState>;

export const defaultTracesFilter: FilterState = {
  'graphql.client': [],
  'graphql.errorCode': [],
  'graphql.kind': [],
  'graphql.operation': [],
  'graphql.status': [],
  'graphql.subgraph': [],
  'http.host': [],
  'http.method': [],
  'http.route': [],
  'http.status': [],
  'http.url': [],
  'trace.id': [],
  duration: [],
};

type FilterProps = {
  filter: FilterState;
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

function Filters(
  props: FilterProps & {
    options: FilterOptions;
  },
) {
  const filters = props.filter;
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
                ...params,
                filter: {
                  ...('filter' in params ? params.filter : {}),
                  [key]: value,
                },
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
      search(params) {
        return {
          ...params,
          filter: {},
        };
      },
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
      <div className="text-fg flex h-8 shrink-0 items-center justify-between rounded-md px-2 text-xs font-medium">
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
            <span className="text-fg-secondary ml-2 font-mono font-normal">
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
      <div className="border-line flex items-center gap-3 border-b px-6 pb-4 text-xs">
        {trace ? (
          <>
            <div className="flex items-center gap-1">
              <Clock className="text-fg-secondary size-3" />
              <span className="text-fg-default">{formatNanoseconds(BigInt(trace.duration))}</span>
            </div>
            <Badge
              content={trace.success ? 'Ok' : 'Error'}
              variants={{ variant: trace.success ? 'success' : 'critical' }}
            />
            <span className="text-fg-default font-mono uppercase">
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
    $filterTopN: Int!
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
      tracesFilterOptions(filter: $filter) {
        success {
          value
          count
        }
        operationType {
          value
          count
        }
        operationName(top: $filterTopN) {
          value
          count
        }
        clientName(top: $filterTopN) {
          value
          count
        }
        httpStatusCode(top: $filterTopN) {
          value
          count
        }
        httpMethod(top: $filterTopN) {
          value
          count
        }
        httpHost(top: $filterTopN) {
          value
          count
        }
        httpRoute(top: $filterTopN) {
          value
          count
        }
        httpUrl(top: $filterTopN) {
          value
          count
        }
        subgraphs(top: $filterTopN) {
          value
          count
        }
        errorCode {
          value
          count
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

export function tracesPageVariables(
  slugs: { organizationSlug: string; projectSlug: string; targetSlug: string },
  filter: FilterState,
  sorting: SortState,
  period: { from: string; to: string },
) {
  return {
    targetRef: slugs,
    filter: {
      period,
      duration: {
        min: filter.duration?.[0] ?? null,
        max: filter.duration?.[1] ?? null,
      },
      traceIds: filter['trace.id'],
      success: filter['graphql.status']?.map(status => (status === 'ok' ? true : false)),
      errorCodes: filter['graphql.errorCode'],
      operationNames: filter['graphql.operation'],
      operationTypes: filter['graphql.kind'] as any,
      clientNames: filter['graphql.client'],
      subgraphNames: filter['graphql.subgraph'],
      httpStatusCodes: filter['http.status'],
      httpMethods: filter['http.method'],
      httpHosts: filter['http.host'],
      httpRoutes: filter['http.route'],
      httpUrls: filter['http.url'],
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
    filterTopN: 5,
  };
}

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

  const filterOptions = useMemo(() => {
    const options = query.data?.target?.tracesFilterOptions;

    return {
      'graphql.status':
        options?.success.map(option => ({
          value: option.value ? 'ok' : 'error',
          searchContent: option.value ? 'ok' : 'error',
          label: option.value ? 'Ok' : 'Error',
          count: option.count,
        })) ?? [],
      'graphql.kind':
        options?.operationType.map(option => ({
          value: option.value === '' ? null : option.value.toUpperCase(),
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'graphql.name':
        options?.operationName.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'http.status':
        options?.httpStatusCode.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'http.method':
        options?.httpMethod.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'http.host':
        options?.httpHost.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'http.route':
        options?.httpRoute.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'http.url':
        options?.httpUrl.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'graphql.subgraph':
        options?.subgraphs.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'graphql.errorCode':
        options?.errorCode.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
      'graphql.client':
        options?.clientName.map(option => ({
          value: option.value,
          searchContent: option.value,
          label: option.value,
          count: option.count,
        })) ?? [],
    };
  }, [query.data?.target?.tracesFilterOptions]);

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
        sideContent={
          <div className="flex flex-1 justify-end gap-x-4">
            <DateRangePicker
              selectedRange={dateRangeController.selectedPreset.range}
              startDate={dateRangeController.startDate}
              align="end"
              onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
            />
            <RefreshButton
              onClick={() => dateRangeController.refreshResolvedRange()}
              disabled={isLoading}
            />
          </div>
        }
      />
      <div className="mt-4 flex min-h-svh w-full">
        <aside className="text-fg-default sticky top-4 flex h-full w-64 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <Filters filter={props.filter} options={filterOptions} />
          </div>
        </aside>
        <main className="relative flex min-h-svh flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 pl-4 pt-0">
            <div>
              <TrafficBucketDiagram buckets={query.data?.target?.tracesStatusBreakdown ?? []} />
            </div>
            <TracesList
              sorting={props.sorting}
              traces={traces}
              onSelectTraceId={setSelectedTraceId}
              selectedTraceId={selectedTraceId}
              isFetching={query.fetching}
              pagination={pagination}
            />
          </div>
        </main>
      </div>
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
