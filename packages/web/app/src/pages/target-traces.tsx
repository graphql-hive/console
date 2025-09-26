import { Fragment, memo, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { formatDate, formatISO, parse as parseDate } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  ExternalLinkIcon,
  LoaderCircleIcon,
  XIcon,
} from 'lucide-react';
import { Bar, BarChart, ReferenceArea, XAxis } from 'recharts';
import { useClient, useQuery } from 'urql';
import { z } from 'zod';
import { Page, TargetLayout, useTargetReference } from '@/components/layouts/target';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Sidebar,
  SidebarContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  OnChangeFn,
  useReactTable,
} from '@tanstack/react-table';
import * as GraphQLSchema from '../gql/graphql';
import * as dateMath from '../lib/date-math';
import {
  CopyIconButton,
  formatNanoseconds,
  TraceSheet as ImportedTraceSheet,
} from './target-trace';
import {
  DurationFilter,
  MultiInputFilter,
  MultiSelectFilter,
  TimelineFilter,
} from './traces/target-traces-filter';

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

const Traffic_TracesStatusBreakdownBucketFragment = graphql(`
  fragment Traffic_TracesStatusBreakdownBucketFragment on TraceStatusBreakdownBucket {
    timeBucket
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
  const data = buckets.map(b => ({
    ok: b.okCountFiltered,
    error: b.errorCountFiltered,
    remaining: b.okCountTotal + b.errorCountTotal - b.okCountFiltered - b.errorCountFiltered,
    timeBucket: b.timeBucket.substring(0, 10),
  }));
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Handle mouse down event to start selection
  const handleMouseDown = useCallback((e: any) => {
    if (!e?.activeLabel) return;

    // Check if the click is within the chart area and not on the Y-axis
    // e.chartX is the x-coordinate of the click relative to the chart
    if (e.chartX < 40) return; // Prevent selection when clicking on Y-axis area

    setRefAreaLeft(e.activeLabel);
    setRefAreaRight(null);
    setIsSelecting(true);
  }, []);

  // Handle mouse move event during selection
  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isSelecting || !e?.activeLabel) return;
      setRefAreaRight(e.activeLabel);
    },
    [isSelecting],
  );

  const navigate = useNavigate();

  // Handle mouse up event to end selection
  const handleMouseUp = useCallback(() => {
    if (!refAreaLeft || !refAreaRight) {
      setIsSelecting(false);
      return;
    }

    // Ensure left is always before right
    let left = refAreaLeft;
    let right = refAreaRight;
    const now = new Date();

    if (
      parseDate(left, 'yyyy-MM-dd', now).getTime() > parseDate(right, 'yyyy-MM-dd', now).getTime()
    ) {
      [left, right] = [right, left];
    }

    void navigate({
      search: (prev: any) => ({ ...prev, filter: { ...prev.filter, period: [left, right] } }),
    });

    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  }, [refAreaLeft, refAreaRight, navigate]);

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[150px] w-full select-none"
      ref={chartContainerRef}
      onMouseLeave={isSelecting ? handleMouseUp : undefined}
    >
      <BarChart
        accessibilityLayer
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        data={data}
      >
        <XAxis
          dataKey="timeBucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={value => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[150px]"
              labelFormatter={value => {
                return new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }}
            />
          }
        />
        <Bar stackId="all" dataKey="ok" fill="var(--color-ok)" name="Ok" />
        <Bar stackId="all" dataKey="error" fill="var(--color-error)" name="Error" />
        <Bar stackId="all" dataKey="remaining" fill="rgba(170,175,180,0.1)" name="Filtered out" />
        {refAreaLeft && refAreaRight && (
          <ReferenceArea x1={refAreaLeft} x2={refAreaRight} fill="white" fillOpacity={0.2} />
        )}
      </BarChart>
    </ChartContainer>
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

const TargetTracesPaginationShape = z.object({
  pageIndex: z.number().min(0).default(0),
  pageSize: z.number().min(10).max(100).default(20),
});
export const TargetTracesPagination = {
  shape: TargetTracesPaginationShape,
};

export type PaginationState = z.infer<typeof TargetTracesPaginationShape>;
type PaginationProps = {
  pagination: PaginationState;
};

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

const TracesList = memo(function TracesList(
  props: SortProps &
    PaginationProps & {
      traces: FragmentType<typeof TracesList_Trace>[];
      onSelectTraceId: (traceId: string) => void;
      selectedTraceId: string | null;
      isFetching: boolean;
      filter: GraphQLSchema.TracesFilterInput;
      isFetchingMore: boolean;
      fetchMore: null | (() => void);
    },
) {
  const router = useRouter();
  const data = useFragment(TracesList_Trace, props.traces);

  const onSortingChange = useCallback<
    OnChangeFn<
      Array<{
        id: string;
        desc: boolean;
      }>
    >
  >(
    updater => {
      const value = typeof updater === 'function' ? updater([props.sorting]) : updater;
      void router.navigate({
        search(params) {
          return {
            ...params,
            sort: value[0] as SortState,
          };
        },
      });
    },
    [router],
  );

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    updater => {
      const value = typeof updater === 'function' ? updater(props.pagination) : updater;

      if (JSON.stringify(value) === JSON.stringify(props.pagination)) {
        return;
      }

      void router.navigate({
        search(params) {
          return {
            ...params,
            pagination: value,
          };
        },
      });
    },
    [router],
  );

  const table = useReactTable({
    data,
    columns: [
      {
        accessorKey: 'id',
        header: () => <div className="pl-2 text-left">Trace ID</div>,
        cell: ({ row }) => {
          const targetRef = useTargetReference();
          const traceId = row.getValue('id') as string;

          return (
            <div className="px-2 text-left font-mono text-xs font-medium">
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/trace/$traceId"
                params={{
                  organizationSlug: targetRef.organizationSlug,
                  projectSlug: targetRef.projectSlug,
                  targetSlug: targetRef.targetSlug,
                  traceId,
                }}
                className="group block w-[6ch] overflow-hidden whitespace-nowrap text-white"
              >
                <span>
                  <span className="underline decoration-gray-800 decoration-2 underline-offset-2 group-hover:decoration-white">
                    {traceId.substring(0, 8)}
                  </span>
                  <span
                    style={{
                      color: 'transparent',
                      pointerEvents: 'none',
                      textDecoration: 'none',
                    }}
                  >
                    {traceId.substring(8)}
                  </span>
                </span>
              </Link>
            </div>
          );
        },
      },
      {
        accessorKey: 'timestamp',
        header: ({ column }) => {
          return (
            <Button
              variant="link"
              className="text-muted-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Timestamp
              {props.sorting.id === 'timestamp' ? (
                props.sorting.desc ? (
                  <ArrowDown className="ml-2 size-4" />
                ) : (
                  <ArrowUp className="ml-2 size-4" />
                )
              ) : (
                <ArrowUpDown className="ml-2 size-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const timestamp = row.getValue('timestamp') as number;

          return (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="px-4 font-mono text-xs uppercase">
                    {formatDate(row.getValue('timestamp'), 'MMM dd HH:mm:ss')}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="cursor-auto overflow-hidden rounded-lg p-2 text-xs text-gray-100 shadow-lg sm:min-w-[150px]"
                  onClick={e => {
                    // Prevent the click event from bubbling up to the row,
                    // which would trigger the sheet with trace details to open
                    e.stopPropagation();
                  }}
                >
                  <GridTable
                    rows={[
                      {
                        key: 'Local',
                        value: formatDate(timestamp, 'MMM dd HH:mm:ss'),
                      },
                      {
                        key: 'UTC',
                        value: formatInTimeZone(timestamp, 'UTC', 'MMM dd HH:mm:ss'),
                      },
                      {
                        key: 'Unix',
                        value: timestamp,
                      },
                      {
                        key: 'ISO',
                        value: formatISO(toZonedTime(timestamp, 'UTC')),
                      },
                    ]}
                  />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: 'operationName',
        header: () => {
          return <div className="text-muted-foreground px-4">Operation Name</div>;
        },
        cell: ({ row }) => (
          <TooltipProvider>
            <Tooltip disableHoverableContent delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-4 text-xs">
                  <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-1 py-0.5 uppercase">
                    {row.original.operationType?.substring(0, 1).toUpperCase() ?? 'U'}
                  </span>
                  <span>
                    {row.getValue('operationName') ?? (
                      <span className="text-gray-400">{'<unknown>'}</span>
                    )}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="overflow-hidden rounded-lg p-2 text-xs text-gray-100 shadow-lg sm:min-w-[150px]"
              >
                <GridTable
                  rows={[
                    {
                      key: 'Name',
                      value: row.getValue('operationName'),
                    },
                    {
                      key: 'Kind',
                      value: row.original.operationType,
                    },
                    {
                      key: 'Hash',
                      value: row.original.operationHash,
                    },
                  ]}
                />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
      {
        accessorKey: 'duration',
        header: ({ column }) => {
          return (
            <div>
              <Button
                variant="link"
                className="text-muted-foreground"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                Duration
                {props.sorting.id === 'duration' ? (
                  props.sorting.desc ? (
                    <ArrowDown className="ml-2 size-4" />
                  ) : (
                    <ArrowUp className="ml-2 size-4" />
                  )
                ) : (
                  <ArrowUpDown className="ml-2 size-4" />
                )}
              </Button>
            </div>
          );
        },
        cell: ({ row }) => {
          const duration = formatNanoseconds(BigInt(row.getValue('duration')));
          return <div className="px-4 font-mono text-xs font-medium">{duration}</div>;
        },
      },
      {
        accessorKey: 'success',
        header: () => <div className="text-center">Status</div>,
        cell: ({ row }) => {
          const status = row.getValue('success');

          return (
            <div className="text-center">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-sm border-0 px-1 text-xs font-medium uppercase',
                  status ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400',
                )}
              >
                {status ? 'Ok' : 'Error'}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'subgraphs',
        header: () => <div className="text-center">Subgraphs</div>,
        cell: ({ row }) => {
          return (
            <TooltipProvider>
              <Tooltip disableHoverableContent delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="text-center font-mono text-xs font-medium">
                    {(row.getValue('subgraphs') as Array<string>).length}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="overflow-hidden rounded-lg p-2 text-xs text-gray-100 shadow-lg sm:min-w-[150px]"
                >
                  <GridTable
                    rows={[
                      {
                        key: 'Subgraphs',
                        value: (row.getValue('subgraphs') as Array<string>).length
                          ? (row.getValue('subgraphs') as Array<string>).join(', ')
                          : '<none>',
                      },
                    ]}
                  />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: 'httpMethod',
        header: () => <div className="text-center">HTTP Method</div>,
        cell: ({ row }) => {
          return (
            <div className="text-center font-mono text-xs font-medium">
              {row.getValue('httpMethod')}
            </div>
          );
        },
      },
      {
        accessorKey: 'httpStatusCode',
        header: () => <div className="text-center">HTTP Status</div>,
        cell: ({ row }) => {
          return (
            <div className="text-center font-mono text-xs font-medium">
              {row.getValue('httpStatusCode')}
            </div>
          );
        },
      },
    ],
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange,
    manualPagination: true,
    state: {
      sorting: [props.sorting],
      pagination: props.pagination,
    },
  });

  return (
    <>
      <div className="rounded-lg border bg-gray-900/50 shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id} className="[&:has([role=checkbox])]:pl-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}{' '}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {props.isFetching && props.traces.length === 0 ? (
              <tr>
                <td colSpan={table.options.columns.length}>
                  <div className="flex h-24 w-full">
                    <Spinner className="m-auto" />
                  </div>
                </td>
              </tr>
            ) : data.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'cursor-pointer',
                    props.selectedTraceId === row.original.id ? 'bg-white/10' : '',
                  )}
                  onClick={ev => {
                    ev.preventDefault();
                    props.onSelectTraceId(row.original.id);
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="font-mono [&:has([role=checkbox])]:pl-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.options.columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 pt-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              props.fetchMore?.();
            }}
            disabled={props.isFetchingMore || !props.fetchMore}
          >
            {props.isFetchingMore ? (
              <>
                <LoaderCircleIcon className="mr-2 inline size-4 animate-spin" /> Loading
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      </div>
    </>
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
  period: z.union([z.tuple([z.string(), z.string()]), z.tuple([])]).default([]),
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
  const updateHandlersRef = useRef(new Map<FilterKeys, (value: any) => void>());
  const updateFilter = useCallback(
    <$Key extends FilterKeys>(key: $Key): ((value: FilterState[$Key]) => void) => {
      if (!updateHandlersRef.current.has(key)) {
        const handler = (value: FilterState[$Key]) => {
          void router.navigate({
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
    void router.navigate({
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
      <SidebarGroupLabel className="flex items-center justify-between">
        <div>Filters</div>
        {hasChanges ? (
          <Button variant="ghost" size="icon-sm" onClick={resetFilters}>
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </SidebarGroupLabel>
      <TimelineFilter value={filterSelector('period')} onChange={updateFilter('period')} />
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
            <LabelWithColor className={option.value === 'ok' ? 'bg-green-600' : 'bg-red-600'}>
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
          label: <LabelWithColor className="bg-red-600">{option.label}</LabelWithColor>,
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  traceId: string;
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
  const [queryResult] = useQuery({
    query: SelectedTraceSheetQuery,
    variables: {
      targetSelector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
      traceId: props.traceId,
    },
  });

  const trace = queryResult.data?.target?.trace;

  return (
    <SheetContent className="border-l border-gray-800 bg-black p-0 text-white md:max-w-[50%]">
      {trace && (
        <SheetHeader className="relative border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-medium text-white">
              {trace?.operationName ?? <span className="text-gray-400">{'<unknown>'}</span>}
              <span className="text-muted-foreground ml-2 font-mono font-normal">
                {trace.id.substring(0, 4)}
              </span>
            </SheetTitle>
          </div>
          <SheetDescription className="mt-1 text-xs text-gray-400">
            Trace ID: <span className="font-mono">{trace.id}</span>
            <CopyIconButton value={trace.id} label="Copy Trace ID" />
          </SheetDescription>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="size-3 text-gray-400" />
              <span className="text-gray-300">{formatNanoseconds(BigInt(trace.duration))}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'rounded-sm border-0 px-1 font-medium uppercase',
                trace.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400',
              )}
            >
              {trace.success ? 'Ok' : 'Error'}
            </Badge>
            <span className="font-mono uppercase text-gray-300">
              {formatDate(trace.timestamp, 'MMM dd HH:mm:ss')}
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/trace/$traceId"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                traceId: props.traceId,
              }}
              className="absolute bottom-4 right-4"
            >
              <ExternalLinkIcon className="mr-1 size-3" />
              Full Trace
            </Link>
          </Button>
        </SheetHeader>
      )}
      {trace && (
        <ImportedTraceSheet
          activeSpanId={null}
          activeSpanTab={null}
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
          trace={trace}
        />
      )}
    </SheetContent>
  );
}

const TargetTracesPageQuery = graphql(`
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

function TargetTracesPageContent(props: SortProps & PaginationProps & FilterProps) {
  const targetRef = useTargetReference();

  const period = useMemo(() => {
    if (!props.filter.period?.length) {
      return null;
    }
    return dateMath.resolveRange({ from: props.filter.period[0], to: props.filter.period[1] });
  }, [props.filter.period]);

  const filter: GraphQLSchema.TracesFilterInput = {
    period,
    duration: {
      min: props.filter.duration?.[0] ?? null,
      max: props.filter.duration?.[1] ?? null,
    },
    traceIds: props.filter['trace.id'],
    success: props.filter['graphql.status']?.map(status => (status === 'ok' ? true : false)),
    errorCodes: props.filter['graphql.errorCode'],
    operationNames: props.filter['graphql.operation'],
    operationTypes: props.filter['graphql.kind'] as any,
    clientNames: props.filter['graphql.client'],
    subgraphNames: props.filter['graphql.subgraph'],
    httpStatusCodes: props.filter['http.status'],
    httpMethods: props.filter['http.method'],
    httpHosts: props.filter['http.host'],
    httpRoutes: props.filter['http.route'],
    httpUrls: props.filter['http.url'],
  };

  const urql = useClient();
  const [query] = useQuery({
    query: TargetTracesPageQuery,
    variables: {
      targetRef: {
        organizationSlug: targetRef.organizationSlug,
        projectSlug: targetRef.projectSlug,
        targetSlug: targetRef.targetSlug,
      },
      filter,
      first: props.pagination.pageSize,
      sort: {
        sort:
          props.sorting.id === 'duration'
            ? GraphQLSchema.TracesSortType.Duration
            : GraphQLSchema.TracesSortType.Timestamp,
        direction: props.sorting.desc
          ? GraphQLSchema.SortDirectionType.Desc
          : GraphQLSchema.SortDirectionType.Asc,
      },
      filterTopN: 5,
    },
  });

  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const traces = useMemo(
    () => query.data?.target?.traces.edges.map(e => e.node),
    [query.data?.target?.traces.edges],
  );

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

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
        organizationSlug={targetRef.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  return (
    <div className="py-6">
      <SubPageLayoutHeader
        subPageTitle="Traces"
        description={
          <>
            <CardDescription>Insights into the requests made to your GraphQL API.</CardDescription>
          </>
        }
      />
      <SidebarProvider className="mt-4">
        <Sidebar collapsible="none" className="bg-transparent">
          <SidebarContent>
            <Filters filter={props.filter} options={filterOptions} />
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="bg-transparent">
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div>
              <TrafficBucketDiagram buckets={query.data?.target?.tracesStatusBreakdown ?? []} />
            </div>
            <TracesList
              sorting={props.sorting}
              pagination={props.pagination}
              traces={traces ?? []}
              onSelectTraceId={setSelectedTraceId}
              selectedTraceId={selectedTraceId}
              isFetching={query.fetching}
              filter={filter}
              isFetchingMore={isFetchingMore}
              fetchMore={
                query.data?.target?.traces.pageInfo.hasNextPage
                  ? () => {
                      if (
                        !query.data?.target?.traces.pageInfo.hasNextPage ||
                        !query.data?.target?.traces.pageInfo.endCursor
                      ) {
                        return;
                      }
                      setIsFetchingMore(true);

                      void urql
                        .query(TargetTracesFetchMoreTracesQuery, {
                          targetRef: {
                            organizationSlug: targetRef.organizationSlug,
                            projectSlug: targetRef.projectSlug,
                            targetSlug: targetRef.targetSlug,
                          },
                          filter,
                          first: props.pagination.pageSize,
                          sort: {
                            sort:
                              props.sorting.id === 'duration'
                                ? GraphQLSchema.TracesSortType.Duration
                                : GraphQLSchema.TracesSortType.Timestamp,
                            direction: props.sorting.desc
                              ? GraphQLSchema.SortDirectionType.Desc
                              : GraphQLSchema.SortDirectionType.Asc,
                          },
                          after: query.data.target.traces.pageInfo.endCursor,
                        })
                        .toPromise()
                        .finally(() => {
                          setIsFetchingMore(false);
                        });
                    }
                  : null
              }
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Sheet
        open={selectedTraceId !== null}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setSelectedTraceId(null);
          }
        }}
      >
        {selectedTraceId && (
          <SelectedTraceSheet
            organizationSlug={targetRef.organizationSlug}
            projectSlug={targetRef.projectSlug}
            targetSlug={targetRef.targetSlug}
            traceId={selectedTraceId}
          />
        )}
      </Sheet>
    </div>
  );
}

export function TargetTracesPage(
  props: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
  } & SortProps &
    PaginationProps &
    FilterProps,
) {
  return (
    <>
      <Meta title="Traces" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Traces}
      >
        <TargetTracesPageContent
          sorting={props.sorting}
          pagination={props.pagination}
          filter={props.filter}
        />
      </TargetLayout>
    </>
  );
}

function GridTable(props: {
  rows: Array<{
    key: string;
    value: ReactNode;
  }>;
}) {
  return (
    <div className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2">
      {props.rows.map(row => (
        <Fragment key={row.key}>
          <div className="font-sans text-gray-400">{row.key}</div>
          <div className="text-right font-mono">{row.value}</div>
        </Fragment>
      ))}
    </div>
  );
}
