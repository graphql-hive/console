import { Fragment, memo, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { formatDate, formatISO, parse as parseDate } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { AlertTriangle, ArrowUpDown, Clock, ExternalLinkIcon, XIcon } from 'lucide-react';
import { Bar, BarChart, ReferenceArea, XAxis } from 'recharts';
import { useQuery } from 'urql';
import { z } from 'zod';
import { GraphQLHighlight } from '@/components/common/GraphQLSDLBlock';
import { Page, TargetLayout, useTargetReference } from '@/components/layouts/target';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Meta } from '@/components/ui/meta';
import { QueryError } from '@/components/ui/query-error';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DocumentType, FragmentType, graphql, useFragment } from '@/gql';
import { formatDuration } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Link, useRouter } from '@tanstack/react-router';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  OnChangeFn,
  useReactTable,
} from '@tanstack/react-table';
import * as dateMath from '../lib/date-math';
import {
  DurationFilter,
  MultiInputFilter,
  MultiSelectFilter,
  TimelineFilter,
} from './traces/target-traces-filter';
import { useWidthSync, WidthSyncProvider } from './traces/target-traces-width';

const rootSpan: SpanProps = {
  id: 'root',
  title: 'FetchProducts',
  serviceName: 'gateway',
  duration: 8.12,
  startedAt: 0,
  children: [
    {
      id: '1ns581b',
      title: 'plan',
      serviceName: 'gateway',
      duration: 2.3,
      startedAt: 0.2,
      children: [],
    },
    {
      id: '213hbsdgs',
      title: 'subgraph',
      serviceName: 'products',
      duration: 4.06,
      startedAt: 2.3,
      children: [
        {
          id: '138sndhs',
          title: 'parse',
          duration: 0.1,
          startedAt: 2.4,
          children: [],
        },
        {
          id: '1n1bsxs1',
          title: 'validate',
          duration: 0.9,
          startedAt: 2.5,
          children: [],
        },
      ],
    },
    {
      id: '1n23sxs1',
      title: 'subgraph',
      serviceName: 'prices',
      duration: 2.03,
      startedAt: 4.06,
      children: [
        {
          id: '19nxb23b',
          title: 'parse',
          duration: 0.1,
          startedAt: 4.1,
          children: [],
        },
        {
          id: '284bsdb1',
          title: 'validate',
          duration: 1.2,
          startedAt: 4.2,
          children: [
            {
              id: '284bsdb1',
              title: 'async validation',
              duration: 0.2,
              startedAt: 5.4,
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

const chartData = [
  { date: '2024-04-01', ok: 222, error: 15 },
  { date: '2024-04-02', ok: 97, error: 18 },
  { date: '2024-04-03', ok: 167, error: 12 },
  { date: '2024-04-04', ok: 242, error: 26 },
  { date: '2024-04-05', ok: 373, error: 29 },
  { date: '2024-04-06', ok: 301, error: 34 },
  { date: '2024-04-07', ok: 245, error: 18 },
  { date: '2024-04-08', ok: 409, error: 32 },
  { date: '2024-04-09', ok: 59, error: 11 },
  { date: '2024-04-10', ok: 261, error: 19 },
  { date: '2024-04-11', ok: 327, error: 35 },
  { date: '2024-04-12', ok: 292, error: 21 },
  { date: '2024-04-13', ok: 342, error: 38 },
  { date: '2024-04-14', ok: 137, error: 22 },
  { date: '2024-04-15', ok: 120, error: 17 },
  { date: '2024-04-16', ok: 138, error: 19 },
  { date: '2024-04-17', ok: 446, error: 36 },
  { date: '2024-04-18', ok: 364, error: 41 },
  { date: '2024-04-19', ok: 243, error: 18 },
  { date: '2024-04-20', ok: 89, error: 15 },
  { date: '2024-04-21', ok: 137, error: 20 },
  { date: '2024-04-22', ok: 224, error: 17 },
  { date: '2024-04-23', ok: 138, error: 23 },
  { date: '2024-04-24', ok: 387, error: 29 },
  { date: '2024-04-25', ok: 215, error: 25 },
  { date: '2024-04-26', ok: 75, error: 13 },
  { date: '2024-04-27', ok: 383, error: 42 },
  { date: '2024-04-28', ok: 122, error: 18 },
  { date: '2024-04-29', ok: 315, error: 24 },
  { date: '2024-04-30', ok: 454, error: 38 },
  { date: '2024-05-01', ok: 165, error: 22 },
  { date: '2024-05-02', ok: 293, error: 31 },
  { date: '2024-05-03', ok: 247, error: 19 },
  { date: '2024-05-04', ok: 385, error: 42 },
  { date: '2024-05-05', ok: 481, error: 39 },
  { date: '2024-05-06', ok: 498, error: 52 },
  { date: '2024-05-07', ok: 388, error: 30 },
  { date: '2024-05-08', ok: 149, error: 21 },
  { date: '2024-05-09', ok: 227, error: 18 },
  { date: '2024-05-10', ok: 293, error: 33 },
  { date: '2024-05-11', ok: 335, error: 27 },
  { date: '2024-05-12', ok: 197, error: 24 },
  { date: '2024-05-13', ok: 197, error: 16 },
  { date: '2024-05-14', ok: 448, error: 49 },
  { date: '2024-05-15', ok: 473, error: 38 },
  { date: '2024-05-16', ok: 338, error: 40 },
  { date: '2024-05-17', ok: 499, error: 42 },
  { date: '2024-05-18', ok: 315, error: 35 },
  { date: '2024-05-19', ok: 235, error: 18 },
  { date: '2024-05-20', ok: 177, error: 23 },
  { date: '2024-05-21', ok: 82, error: 14 },
  { date: '2024-05-22', ok: 81, error: 12 },
  { date: '2024-05-23', ok: 252, error: 29 },
  { date: '2024-05-24', ok: 294, error: 22 },
  { date: '2024-05-25', ok: 201, error: 25 },
  { date: '2024-05-26', ok: 213, error: 17 },
  { date: '2024-05-27', ok: 420, error: 46 },
  { date: '2024-05-28', ok: 233, error: 19 },
  { date: '2024-05-29', ok: 78, error: 13 },
  { date: '2024-05-30', ok: 340, error: 28 },
  { date: '2024-05-31', ok: 178, error: 23 },
  { date: '2024-06-01', ok: 178, error: 20 },
  { date: '2024-06-02', ok: 470, error: 41 },
  { date: '2024-06-03', ok: 103, error: 16 },
  { date: '2024-06-04', ok: 439, error: 38 },
  { date: '2024-06-05', ok: 88, error: 14 },
  { date: '2024-06-06', ok: 294, error: 25 },
  { date: '2024-06-07', ok: 323, error: 37 },
  { date: '2024-06-08', ok: 385, error: 32 },
  { date: '2024-06-09', ok: 438, error: 48 },
  { date: '2024-06-10', ok: 155, error: 20 },
  { date: '2024-06-11', ok: 92, error: 15 },
  { date: '2024-06-12', ok: 492, error: 42 },
  { date: '2024-06-13', ok: 81, error: 13 },
  { date: '2024-06-14', ok: 426, error: 38 },
  { date: '2024-06-15', ok: 307, error: 35 },
  { date: '2024-06-16', ok: 371, error: 31 },
  { date: '2024-06-17', ok: 475, error: 52 },
  { date: '2024-06-18', ok: 107, error: 17 },
  { date: '2024-06-19', ok: 341, error: 29 },
  { date: '2024-06-20', ok: 408, error: 45 },
  { date: '2024-06-21', ok: 169, error: 21 },
  { date: '2024-06-22', ok: 317, error: 27 },
  { date: '2024-06-23', ok: 480, error: 53 },
  { date: '2024-06-24', ok: 132, error: 18 },
  { date: '2024-06-25', ok: 141, error: 19 },
  { date: '2024-06-26', ok: 434, error: 38 },
  { date: '2024-06-27', ok: 448, error: 49 },
  { date: '2024-06-28', ok: 149, error: 20 },
  { date: '2024-06-29', ok: 103, error: 16 },
  { date: '2024-06-30', ok: 446, error: 40 },
];

const chartConfig = {
  ok: {
    label: 'Successful',
    color: 'hsl(var(--chart-1))',
  },
  error: {
    label: 'Failed',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const Traffic = memo(function Traffic() {
  const data = chartData;
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [_, setZoomedData] = useState<typeof data | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Handle mouse down event to start selection
  const handleMouseDown = useCallback((e: any) => {
    if (!e || !e.activeLabel) return;

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
      if (!isSelecting || !e || !e.activeLabel) return;
      setRefAreaRight(e.activeLabel);
    },
    [isSelecting],
  );

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

    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  }, [refAreaLeft, refAreaRight]);

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
        data={chartData}
      >
        <XAxis
          dataKey="date"
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
        <Bar stackId="all" dataKey="ok" fill={`var(--color-ok)`} />
        <Bar stackId="all" dataKey="error" fill={`var(--color-error)`} />
        {refAreaLeft && refAreaRight && (
          <ReferenceArea x1={refAreaLeft} x2={refAreaRight} fill="white" fillOpacity={0.2} />
        )}
      </BarChart>
    </ChartContainer>
  );
});

type Trace = {
  id: string;
  timestamp: number;
  duration: number;
  status: 'ok' | 'error';
  kind: 'query' | 'mutation' | 'subscription';
  operationName: string;
  operationHash: string;
  httpStatus: number;
  httpMethod: 'GET' | 'POST';
  httpHost: string;
  httpRoute: string;
  httpUrl: string;
  subgraphNames: string[];
};

const TargetTracesSortShape = z
  .array(
    z.object({
      desc: z.coerce.boolean(),
      id: z.string(),
    }),
  )
  .default([
    {
      desc: true,
      id: 'timestamp',
    },
  ]);
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

type PaginationState = z.infer<typeof TargetTracesPaginationShape>;
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
  }
`);

const TracesList = memo(function TracesList(
  props: SortProps &
    PaginationProps & {
      traces: FragmentType<typeof TracesList_Trace>[];
    },
) {
  const [traceInSheet, setTraceInSheet] = useState<Trace | null>(null);
  const router = useRouter();
  const data = useFragment(TracesList_Trace, props.traces);

  const onSortingChange = useCallback<OnChangeFn<SortState>>(
    updater => {
      const value = typeof updater === 'function' ? updater(props.sorting) : updater;
      if (JSON.stringify(value) === JSON.stringify(props.sorting)) {
        return;
      }

      void router.navigate({
        search(params) {
          return {
            ...params,
            sort: value,
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
              <ArrowUpDown className="ml-2 size-4" />
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
        header: ({ column }) => {
          return (
            <div>
              <Button
                variant="link"
                className="text-muted-foreground"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                Operation Name
                <ArrowUpDown className="ml-2 size-4" />
              </Button>
            </div>
          );
        },
        cell: ({ row }) => (
          <TooltipProvider>
            <Tooltip disableHoverableContent delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-4 text-xs">
                  <span className="text-muted-foreground font-mono">
                    {Math.random().toString(16).substring(2, 6)}
                  </span>
                  <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-1 py-0.5 uppercase">
                    {row.original.operationType.substring(0, 1).toUpperCase()}
                  </span>
                  <span>{row.getValue('operationName')}</span>
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
                      value: Math.random().toString(16).substring(2),
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
                <ArrowUpDown className="ml-2 size-4" />
              </Button>
            </div>
          );
        },
        cell: ({ row }) => {
          const duration = formatDuration(row.getValue('duration') / 1000000, true);
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
        sortingFn(a, b, isAsc) {
          const aValue = a.original.subgraphs.length;
          const bValue = b.original.subgraphs.length;

          if (isAsc) {
            return aValue - bValue;
          }

          return bValue - aValue;
        },
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="link"
              className="text-muted-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Subgraphs
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-center font-mono text-xs font-medium">
              {row.getValue('subgraphs').length}
            </div>
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
    state: {
      sorting: props.sorting,
      pagination: props.pagination,
    },
  });

  return (
    <Sheet
      defaultOpen={false}
      open={traceInSheet !== null}
      onOpenChange={isOpen => {
        if (!isOpen) {
          setTraceInSheet(null);
        }
      }}
    >
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
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'cursor-pointer',
                    traceInSheet?.id === row.original.id ? 'bg-white/10' : '',
                  )}
                  onClick={ev => {
                    ev.preventDefault();
                    setTraceInSheet(row.original);
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
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
      <TraceSheet trace={traceInSheet} />
    </Sheet>
  );
});

function LabelWithColor(props: { className: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-x-2">
      <div className={cn(`rounded-xs h-[11px] w-[2px]`, props.className)}></div>
      <div>{props.children}</div>
    </div>
  );
}

function LabelWithBadge(props: {
  children: ReactNode;
  badgeText: string;
  side?: 'left' | 'right';
}) {
  return (
    <div
      className={cn('flex items-center gap-1', props.side === 'right' ? 'flex-row-reverse' : '')}
    >
      <Badge variant="outline" className="rounded-sm px-1 font-normal">
        {props.badgeText}
      </Badge>
      <span className="text-foreground font-medium">{props.children}</span>
    </div>
  );
}

export const TargetTracesFilterState = z.object({
  period: z.union([z.tuple([z.string(), z.string()]), z.tuple([])]).default([]),
  duration: z.union([z.tuple([z.number(), z.number()]), z.tuple([])]).default([]),
  'trace.id': z.array(z.string()).default([]),
  'graphql.status': z.array(z.string()).default([]),
  'graphql.kind': z.array(z.string()).default([]),
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

type FilterState = z.infer<typeof TargetTracesFilterState>;

type FilterProps = {
  filter: FilterState;
};

type FilterKeys = keyof FilterState;

const filterOptions = {
  'graphql.status': [
    {
      value: 'ok',
      searchContent: 'ok',
      label: <LabelWithColor className="bg-green-600">Ok</LabelWithColor>,
      count: 12_500_000,
    },
    {
      value: 'error',
      searchContent: 'error',
      label: <LabelWithColor className="bg-red-600">Error</LabelWithColor>,
      count: 13_123,
    },
  ],
  'graphql.kind': [
    {
      value: 'query',
      searchContent: 'query',
      label: 'Query',
      count: 12_500_000,
    },
    {
      value: 'mutation',
      searchContent: 'mutation',
      label: 'Mutation',
      count: 3_200_000,
    },
    {
      value: 'subscription',
      searchContent: 'subscription',
      label: 'Subscription',
      count: 123_123,
    },
  ],
  'graphql.subgraph': [
    {
      value: 'link',
      searchContent: 'link',
      label: 'link',
      count: 530_000,
    },
    {
      value: 'products',
      searchContent: 'products',
      label: 'products',
      count: 612_000,
    },
    {
      value: 'prices',
      searchContent: 'prices',
      label: 'prices',
      count: 610_000,
    },
  ],
  'graphql.name': [
    {
      value: '3h1s',
      searchContent: '3h1s fetchproducts',
      label: <LabelWithBadge badgeText="3h1s">FetchProducts</LabelWithBadge>,
      count: 368_000,
    },
    {
      value: '7na1',
      searchContent: '7na1 fetchUsers',
      label: <LabelWithBadge badgeText="7na1">FetchUsers</LabelWithBadge>,
      count: 123_000,
    },
    {
      value: '64a1',
      searchContent: '64a1 FetchProducts',
      label: <LabelWithBadge badgeText="64a1">FetchProducts</LabelWithBadge>,
      count: 1_000,
    },
  ],
  'graphql.client': [
    {
      value: 'unknown',
      searchContent: 'unknown',
      label: 'unknown',
      count: 43_123,
    },
    {
      value: 'hive-app',
      searchContent: 'hive-app',
      label: 'hive-app',
      count: 720_000,
    },
    {
      value: 'Hive CLI',
      searchContent: 'Hive CLI',
      label: 'Hive CLI',
      count: 340_000,
    },
    {
      value: 'Hive Client',
      searchContent: 'Hive Client',
      label: 'Hive Client',
      count: 87_123,
    },
    {
      value: 'Hive CLI@0.46.0',
      searchContent: 'Hive CLI@0.46.0',
      label: (
        <LabelWithBadge side="right" badgeText="0.46.0">
          Hive CLI
        </LabelWithBadge>
      ),
      count: 1_000,
    },
    {
      value: 'Hive Client@0.25.3',
      searchContent: 'Hive Client@0.25.3',
      label: (
        <LabelWithBadge side="right" badgeText="0.25.3">
          Hive Client
        </LabelWithBadge>
      ),
      count: 6_120,
    },
  ],
  'http.status': [
    {
      value: '200',
      searchContent: '200',
      label: '200',
      count: 9_123_000,
    },
    {
      value: '400',
      searchContent: '400',
      label: '400',
      count: 100_000,
    },
    {
      value: '500',
      searchContent: '500',
      label: '500',
      count: 52_400,
    },
  ],
  'http.method': [
    {
      value: 'GET',
      searchContent: 'get',
      label: 'GET',
      count: 1230,
    },
    {
      value: 'POST',
      searchContent: 'post',
      label: 'POST',
      count: 12_000_000,
    },
  ],
  'http.host': [
    {
      value: 'localhost:4000',
      searchContent: 'localhost:4000',
      label: 'localhost:4000',
      count: 12_000_000,
    },
    {
      value: 'localhost:4200',
      searchContent: 'localhost:4200',
      label: 'localhost:4200',
      count: 7_540_123,
    },
    {
      value: 'localhost:3000',
      searchContent: 'localhost:3000',
      label: 'localhost:3000',
      count: 2_320_123,
    },
  ],
  'http.route': [
    {
      value: '/graphql',
      searchContent: '/graphql',
      label: '/graphql',
      count: 12_000_000,
    },
    {
      value: '/',
      searchContent: '/',
      label: '/',
      count: 7_540_123,
    },
  ],
  'http.url': [
    {
      value: 'http://localhost:3000/',
      searchContent: 'http://localhost:3000/',
      label: 'http://localhost:3000/',
      count: 12_000_000,
    },
    {
      value: 'http://localhost:4000/graphql',
      searchContent: 'http://localhost:4000/graphql',
      label: 'http://localhost:4000/graphql',
      count: 7_540_123,
    },
    {
      value: 'http://localhost:4200/graphql',
      searchContent: 'http://localhost:4200/graphql',
      label: 'http://localhost:4200/graphql',
      count: 2_320_123,
    },
  ],
  'graphql.errorCode': [
    {
      value: 'ERR_AAA',
      searchContent: 'ERR_AAA',
      label: 'ERR_AAA',
      count: 12_000_000,
    },
  ],
};

function Filters(
  props: FilterProps & {
    options: typeof filterOptions;
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
    for (let key in filters) {
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
        options={filterOptions['graphql.status']}
        selectedValues={filterSelector('graphql.status')}
        onChange={updateFilter('graphql.status')}
        hideSearch
      />
      <MultiSelectFilter
        key="graphql.errorCode"
        name="Error Code"
        options={filterOptions['graphql.errorCode']}
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

const fetchProductsQueryString = `
  query FetchProduct {
    products {
      id
      name
      price
    }
  }
`;

interface TraceAttribute {
  name: string;
  value: string | number | ReactNode;
  category?: string;
}

function TraceView(props: { rootSpan: SpanProps; serviceNames: string[] }) {
  const [width] = useWidthSync();
  const [highlightedServiceName, setHighlightedServiceName] = useState<string | null>(null);
  const rootSpan = props.rootSpan;
  const serviceNames = props.serviceNames;

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-800">
        <div className="flex w-full items-center text-xs text-white">
          <div className="h-12 shrink-0 py-2" style={{ width }}>
            <div className="pl-4">
              <div className="font-medium">Timeline</div>
              <div className="text-xs text-gray-500">Spans and details</div>
            </div>
          </div>
          <div className="h-12 grow pr-8">
            <div className="relative h-full w-full">
              <div className="absolute left-0 top-6 -translate-x-1/2 text-center">0ms</div>
              <div className="absolute bottom-0 left-0 h-2 w-px bg-[#27272a]" />
              <div className="absolute left-[25%] top-6 -translate-x-1/2 text-center">2.03ms</div>
              <div className="absolute bottom-0 left-[25%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute left-[50%] top-6 -translate-x-1/2 text-center">4.06ms</div>
              <div className="absolute bottom-0 left-[50%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute left-[75%] top-6 -translate-x-1/2 text-center">6.09ms</div>
              <div className="absolute bottom-0 left-[75%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
              <div className="absolute right-0 top-6 translate-x-1/2 text-center">8.12ms</div>
              <div className="absolute bottom-0 right-0 h-2 w-px -translate-x-1/2 bg-[#27272a]" />
            </div>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-grow">
        <div>
          <TraceTree
            leftPanelWidth={width}
            rootSpan={rootSpan}
            highlightedServiceName={highlightedServiceName}
          />
        </div>
      </ScrollArea>
      <div className="sticky bottom-0 z-10 px-2 py-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
          {serviceNames.map((serviceName, index) => (
            <div
              key={serviceName}
              className="flex cursor-pointer items-center gap-2 hover:text-white"
              onMouseEnter={() => setHighlightedServiceName(serviceName)}
              onMouseLeave={() => setHighlightedServiceName(null)}
            >
              <div
                className="size-2"
                style={{
                  backgroundColor: colors[index % colors.length],
                }}
              />
              <div>{serviceName}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TraceSheet(props: { trace: DocumentType<typeof TracesList_Trace> | null }) {
  const targetRef = useTargetReference();
  const [activeView, setActiveView] = useState<'attributes' | 'events' | 'operation'>('attributes');
  const trace = props.trace;

  if (!trace) {
    return null;
  }

  const attributes: Array<TraceAttribute> = [
    {
      name: 'graphql.operationKind',
      value: trace.operationType,
      category: 'GraphQL',
    },
    {
      name: 'graphql.subgraphs',
      value: trace.subgraphs.join(', '),
      category: 'GraphQL',
    },
    {
      name: 'http.method',
      value: trace.httpMethod,
      category: 'HTTP',
    },
    {
      name: 'http.host',
      value: trace.httpHost,
      category: 'HTTP',
    },
    {
      name: 'http.route',
      value: trace.httpRoute,
      category: 'HTTP',
    },
    {
      name: 'http.url',
      value: trace.httpUrl,
      category: 'HTTP',
    },
    {
      name: 'http.status',
      value: trace.httpStatusCode,
      category: 'HTTP',
    },
  ];

  const serviceNames = listServiceNames(rootSpan);

  return (
    <SheetContent className="border-l border-gray-800 bg-black p-0 text-white md:max-w-[50%]">
      <SheetHeader className="relative border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-lg font-medium text-white">
            {trace.operationName}
            <span className="text-muted-foreground ml-2 font-mono font-normal">
              {trace.id.substring(0, 4)}
            </span>
          </SheetTitle>
        </div>
        <SheetDescription className="mt-1 text-xs text-gray-400">
          Trace ID: <span className="font-mono">1a2b3c4d5e6f7g8h9i0j</span>
        </SheetDescription>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-gray-300">{formatDuration(trace.duration, true)}</span>
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
              organizationSlug: targetRef.organizationSlug,
              projectSlug: targetRef.projectSlug,
              targetSlug: targetRef.targetSlug,
              traceId: trace.id,
            }}
            className="absolute bottom-4 right-4"
          >
            <ExternalLinkIcon className="mr-1 h-3 w-3" />
            Full Trace
          </Link>
        </Button>
      </SheetHeader>
      <div className="h-[calc(100vh-113px)]">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={70} minSize={20} maxSize={80}>
            <WidthSyncProvider defaultWidth={251}>
              <TraceView rootSpan={rootSpan} serviceNames={serviceNames} />
            </WidthSyncProvider>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={10} maxSize={80}>
            <div className="flex h-full flex-col">
              <div className="sticky top-0 z-10 border-b border-gray-800">
                <div className="item-center flex w-full gap-x-4 px-2 text-xs font-medium">
                  <TabButton
                    isActive={activeView === 'attributes'}
                    onClick={() => setActiveView('attributes')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Attributes</div>
                      <div>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                        >
                          7
                        </Badge>
                      </div>
                    </div>
                  </TabButton>
                  <TabButton
                    isActive={activeView === 'events'}
                    onClick={() => setActiveView('events')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Events</div>
                      <div>
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-thin"
                        >
                          3
                        </Badge>
                      </div>
                    </div>
                  </TabButton>
                  <TabButton
                    isActive={activeView === 'operation'}
                    onClick={() => setActiveView('operation')}
                  >
                    <div className="flex items-center gap-x-2">
                      <div>Operation</div>
                    </div>
                  </TabButton>
                </div>
              </div>
              <ScrollArea className="relative grow">
                <div className="h-full">
                  {activeView === 'attributes' ? (
                    <div>
                      {attributes.length > 0 ? (
                        <div>
                          {attributes.map((attr, index) => (
                            <div
                              key={index}
                              className="border-border flex items-center justify-between border-b px-3 py-3 text-xs"
                            >
                              <div className="text-gray-400">{attr.name}</div>
                              <div className="font-mono text-white">{attr.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-gray-500" />
                          <p className="text-xs text-gray-500">
                            No attributes found for this trace
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {activeView === 'events' ? (
                    <div className="p-4">
                      <div className="space-y-2">
                        {[
                          {
                            code: 'DB_CONNECTION_ERROR',
                            message: 'Connection to database timed out after 5 seconds',
                            stacktrace: `Error: Connection to database timed out\n\tat PostgresClient.connect (/app/db.js:42:3)\n\tat ProductService.getProducts (/app/services/product.js:15:5)`,
                          },
                          {
                            code: 'GRAPHQL_PARSE_FAILED',
                            message: 'Sent GraphQL Operation cannot be parsed',
                          },
                          {
                            code: 'TIMEOUT_ERROR',
                            message: 'Operation timed out after 10 seconds',
                          },
                        ].map((exception, index) => (
                          <div
                            key={index}
                            className="overflow-hidden rounded-md border border-red-800/50 bg-red-900/20"
                          >
                            <div className="flex items-center justify-between bg-red-900/40 px-3 py-2">
                              <span className="font-mono text-xs font-medium text-red-300">
                                {exception.code}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-red-700 bg-red-950 text-[10px] text-red-300"
                              >
                                Exception
                              </Badge>
                            </div>
                            <div className="p-3 text-xs">
                              <p className="text-gray-300">{exception.message}</p>
                              {exception.stacktrace && (
                                <pre className="mt-2 overflow-x-auto rounded bg-black/50 p-2 font-mono text-[10px] leading-tight text-gray-400">
                                  {exception.stacktrace}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {activeView === 'operation' ? (
                    <div className="absolute bottom-0 top-0 w-full">
                      <GraphQLHighlight
                        height={'100%'}
                        options={{
                          fontSize: 10,
                          minimap: { enabled: false },
                        }}
                        code={fetchProductsQueryString}
                      />
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SheetContent>
  );
}

function SearchBar(props: { onFiltersOpenChange: () => void }) {
  return null;

  // return (
  //   <div className="flex gap-x-4">
  //     <Button
  //       variant="outline"
  //       className="bg-background size-10 p-0"
  //       onClick={props.onFiltersOpenChange}
  //     >
  //       <FilterIcon className="size-4" />
  //     </Button>
  //     <div className="relative w-full">
  //       <SearchIcon className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
  //       <Input type="search" className="pl-9" placeholder="Search..." {...props} />
  //     </div>
  //   </div>
  // );
}

const TargetTracesPageQuery = graphql(`
  query TargetTracesPageQuery(
    $targetRef: TargetSelectorInput!
    $first: Int!
    $filter: TracesFilterInput
    $filterTopN: Int!
  ) {
    target(reference: { bySelector: $targetRef }) {
      id
      traces(first: $first, filter: $filter) {
        edges {
          node {
            ...TracesList_Trace
          }
          cursor
        }
        pageInfo {
          hasNextPage
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
    }
  }
`);

function TargetTracesPageContent(props: SortProps & PaginationProps & FilterProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const targetRef = useTargetReference();

  const period = useMemo(() => {
    if (!props.filter.period.length) {
      return null;
    }
    return dateMath.resolveRange({ from: props.filter.period[0], to: props.filter.period[1] });
  }, [props.filter.period]);

  const [query] = useQuery({
    query: TargetTracesPageQuery,
    variables: {
      targetRef: {
        organizationSlug: targetRef.organizationSlug,
        projectSlug: targetRef.projectSlug,
        targetSlug: targetRef.targetSlug,
      },
      filterTopN: 5,
      filter: {
        period,
        duration: {
          min: props.filter.duration[0] ?? null,
          max: props.filter.duration[1] ?? null,
        },
        traceIds: props.filter['trace.id'],
        success: props.filter['graphql.status'].map(status => (status === 'ok' ? true : false)),
        errorCodes: props.filter['graphql.errorCode'],
        // operationName: props.filter['graphql.operation'],
        // operationType: props.filter['graphql.kind'] as any,
        subgraphNames: props.filter['graphql.subgraph'],
        httpStatusCodes: props.filter['http.status'],
        httpMethods: props.filter['http.method'],
        httpHosts: props.filter['http.host'],
        httpRoutes: props.filter['http.route'],
        httpUrls: props.filter['http.url'],
      },
      first: props.pagination.pageSize,
    },
  });

  const traces = useMemo(
    () => query.data?.target?.traces.edges.map(e => e.node),
    [query.data?.target?.traces.edges],
  );

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
          value: option.value,
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
      'graphql.client': [],
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
      <SidebarProvider>
        {filtersOpen ? (
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              <Filters filter={props.filter} options={filterOptions} />
            </SidebarContent>
          </Sidebar>
        ) : null}
        <SidebarInset className="bg-transparent">
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div>
              <SearchBar onFiltersOpenChange={() => setFiltersOpen(isOpen => !isOpen)} />
              <Traffic />
            </div>
            <TracesList
              sorting={props.sorting}
              pagination={props.pagination}
              traces={traces ?? []}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
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

function TreeIcon(props: {
  level: number;
  /**
   * Decides whether or not to draw the └[]
   */
  hasParent: boolean;
  /**
   * Decides whether or not to draw
   */
  isLeaf: boolean;
  /**
   * Wheter or not to draw ├
   */
  isLastChild: boolean;
  childrenCount: number;
  isCollapsed: boolean;
  lines: boolean[];
  onClick?: () => void;
}) {
  const levelWidth = 16;
  const base = 30;
  const width = base + props.level * levelWidth;

  const leftSideEdgeStart = (props.level - 1) * levelWidth + 12;
  const leftSideEdgeEnd = leftSideEdgeStart + 15;

  const rectLeft = 2 + props.level * levelWidth;

  return (
    <svg
      width={width}
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className="shrink"
      onClick={props.onClick}
    >
      {/* left-side line */}
      {props.hasParent ? (
        <line x1={leftSideEdgeStart} y1="16" x2={leftSideEdgeEnd} y2="16" stroke="currentColor" />
      ) : null}

      {/* bottom line */}
      {props.isLeaf || props.isCollapsed ? null : (
        <line x1={rectLeft + 10} x2={rectLeft + 10} y1="16" y2="32" stroke="currentColor" />
      )}

      {/* leaf span */}
      {props.isLeaf ? (
        <circle cx={props.level * 16 + 12} cy="16" r="3" fill="currentColor"></circle>
      ) : (
        // number block
        <>
          <rect
            x={rectLeft}
            y="8"
            width="20"
            height="16"
            rx="3px"
            ry="3px"
            fill={props.isCollapsed ? 'currentColor' : 'black'}
            stroke="currentColor"
          />
          <text
            x={rectLeft + 10}
            y="20"
            style={{ fontSize: 10 }}
            textAnchor="middle"
            fontWeight={props.isCollapsed ? 700 : 500}
            fill={props.isCollapsed ? 'white' : 'currentColor'}
          >
            {props.childrenCount}
          </text>
        </>
      )}

      {/* this line is the vertical line (for each parent groups) */}
      {props.lines.map((line, index) =>
        line ? (
          <line
            x1={16 * (index + 1) - 4}
            x2={16 * (index + 1) - 4}
            y1="0"
            y2={index === props.level - 1 && props.isLastChild ? 16 : 32}
            stroke="currentColor"
          />
        ) : null,
      )}
    </svg>
  );
}

function TabButton(props: { isActive: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      className={cn(
        'border-b-2 px-2 py-2',
        props.isActive ? 'border-[#2662d8]' : 'hover:border-border border-transparent',
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function TraceResize(props: { minWidth: number; maxWidth: number }) {
  const [width, setWidth] = useWidthSync();
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startWidthRef = useRef(0);
  const { minWidth, maxWidth } = props;

  // Handle the start of dragging
  const handleDragStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      startPosRef.current = clientX;
      startWidthRef.current = width;

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  // Handle dragging
  const handleDrag = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      const delta = clientX - startPosRef.current;
      let newWidth = startWidthRef.current + delta;
      // Constrain to min/max
      newWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(newWidth);
    },
    [isDragging, minWidth, maxWidth, setWidth],
  );

  // Handle the end of dragging
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  }, []);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // Set pointer capture on the drag handle element
      if (handleRef.current) {
        handleRef.current.setPointerCapture(e.pointerId);
      }
      handleDragStart(e.clientX);
    },
    [handleDragStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      handleDrag(e.clientX);
    },
    [isDragging, handleDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // Release pointer capture
      if (handleRef.current) {
        handleRef.current.releasePointerCapture(e.pointerId);
      }
      handleDragEnd();
    },
    [handleDragEnd],
  );

  return (
    <div
      className="absolute bottom-0 top-0 z-20 w-[5px] cursor-ew-resize"
      style={{ left: width - 2 }} // Position 2px to the left of the center
      ref={handleRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Invisible wider hit area */}
      <div
        className={cn(
          'absolute inset-y-0 left-[2px] w-px bg-gray-800',
          isDragging ? 'bg-gray-600' : 'hover:bg-gray-700',
        )}
      />
    </div>
  );
}

function TraceTree(props: {
  highlightedServiceName: string | null;
  rootSpan: SpanProps;
  leftPanelWidth: number;
}) {
  const [width] = useWidthSync();
  const minWidth = 175;
  const maxWidth = 450;
  const serviceNames = listServiceNames(props.rootSpan);
  const serviceNameToColorMap = Object.fromEntries(
    serviceNames.map((name, index) => [name, colors[index % colors.length]]),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={containerRef}>
      <TraceResize minWidth={minWidth} maxWidth={maxWidth} />
      <Node
        key={props.rootSpan.id}
        level={0}
        highlightedServiceName={props.highlightedServiceName}
        totalDuration={rootSpan.duration}
        leftPanelWidth={width}
        span={props.rootSpan}
        parentSpan={null}
        groupLines={[]}
        parentColor={null}
        color={colors[0]}
        serviceNameToColorMap={serviceNameToColorMap}
      />
    </div>
  );
}

type SpanProps = {
  id: string;
  title: string;
  serviceName?: string;
  duration: number;
  startedAt: number;
  children: SpanProps[];
};

type NodeProps = {
  highlightedServiceName: string | null;
  level: number;
  totalDuration: number;
  leftPanelWidth: number;
  span: SpanProps;
  parentSpan: SpanProps | null;
  groupLines: boolean[];
  color: string;
  parentColor: string | null;
  serviceNameToColorMap: Record<string, string>;
};

function countChildren(spans: SpanProps[]): number {
  return spans.reduce((acc, span) => acc + countChildren(span.children), spans.length);
}

function _listServiceNames(span: SpanProps, serviceNames: string[]) {
  if (span.serviceName && !serviceNames.includes(span.serviceName)) {
    serviceNames.push(span.serviceName);
  }

  for (const child of span.children) {
    _listServiceNames(child, serviceNames);
  }
}

function listServiceNames(span: SpanProps): string[] {
  const serviceNames: string[] = [];
  _listServiceNames(span, serviceNames);
  return serviceNames;
}

const colors = [
  '#2662d8',
  '#2eb88a',
  '#e88d30',
  '#af56db',
  '#7BA4F9',
  '#D8B5FF',
  '#64748B',
  '#6C5CE7',
  '#F27059',
  '#2D9D78',
];
function Node(props: NodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const leftPositionPercentage = roundFloatToTwoDecimals(
    (props.span.startedAt / props.totalDuration) * 100,
  );
  const widthPercentage = roundFloatToTwoDecimals(
    (props.span.duration / props.totalDuration) * 100,
  );

  const isNearRightEdge = leftPositionPercentage + widthPercentage > 85;
  const isDimmed =
    typeof props.highlightedServiceName === 'string' &&
    props.highlightedServiceName !== props.span.serviceName;

  const isLastChild =
    props.parentSpan?.children[props.parentSpan.children.length - 1].id === props.span.id;

  const childrenCount = collapsed
    ? countChildren(props.span.children) + 1
    : props.span.children.length;
  const canBeCollapsed = props.span.children.length > 0;

  const color = props.color;
  const parentColor = props.parentColor ?? color;

  const percentageOfTotal = ((props.span.duration / props.totalDuration) * 100).toFixed(2);
  const percentageOfParent = props.parentSpan
    ? ((props.span.duration / props.parentSpan.duration) * 100).toFixed(2)
    : null;

  return (
    <>
      <div className="cursor-pointer pr-8 odd:bg-gray-800/20 hover:bg-gray-900">
        <div className="relative flex h-8 w-full items-center overflow-hidden">
          <div
            className="relative flex h-8 shrink-0 items-center gap-x-2 overflow-hidden pl-1"
            style={{ width: `${props.leftPanelWidth}px` }}
          >
            <div className="flex h-8 shrink-0 items-center overflow-hidden overflow-ellipsis whitespace-nowrap text-gray-500">
              <TreeIcon
                key={`tree-icon-${props.span.id}`}
                isLeaf={props.span.children.length === 0}
                isLastChild={isLastChild}
                childrenCount={childrenCount}
                hasParent={!!props.parentSpan}
                level={props.level}
                lines={props.groupLines}
                isCollapsed={collapsed}
                onClick={canBeCollapsed ? () => setCollapsed(collapsed => !collapsed) : undefined}
              />
            </div>
            <div
              className={cn('whitespace-nowrap text-xs', isDimmed ? 'text-gray-500' : 'text-white')}
            >
              {props.span.title}
            </div>
            {props.span.serviceName ? (
              <div
                className={cn(
                  'overflow-hidden overflow-ellipsis whitespace-nowrap text-xs',
                  isDimmed ? 'text-gray-600' : 'text-gray-500',
                )}
              >
                {props.span.serviceName}
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              'relative flex h-full grow items-center overflow-hidden',
              isDimmed ? 'opacity-25' : '',
            )}
          >
            <TooltipProvider>
              <Tooltip disableHoverableContent delayDuration={100}>
                <TooltipTrigger asChild>
                  <div
                    className={cn('absolute z-20 block h-6 min-w-[1px] select-none rounded-sm')}
                    style={{
                      left: `min(${leftPositionPercentage}%, 100% - 1px)`,
                      width: `${widthPercentage}%`,
                      backgroundColor: color,
                    }}
                  >
                    <div
                      className="absolute top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap px-[4px] font-mono leading-none"
                      style={{
                        fontSize: '11px',
                        ...(isNearRightEdge ? { right: '6px' } : { left: `calc(100% + 6px)` }),
                      }}
                    >
                      {props.span.duration}ms
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="overflow-hidden rounded-lg p-2 text-xs text-gray-100 shadow-lg sm:min-w-[200px]"
                >
                  {/* Content */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-gray-400">Duration</div>
                      <div className="text-right font-mono">
                        <span>{props.span.duration}ms</span>
                      </div>

                      <div className="text-gray-400">Started At</div>
                      <div className="text-right font-mono">{props.span.startedAt}ms</div>

                      <div className="text-gray-400">% of Total</div>
                      <div className="text-right font-mono">{percentageOfTotal}%</div>

                      <div className="col-span-2">
                        {/* Timeline visualization */}
                        <div>
                          <div className="h-[2px] w-full overflow-hidden bg-gray-800">
                            <div
                              className="h-full"
                              style={{ width: `${percentageOfTotal}%`, backgroundColor: colors[0] }}
                            />
                          </div>
                        </div>
                      </div>

                      {percentageOfParent === null ? null : (
                        <>
                          <div className="text-gray-400">% of Parent</div>
                          <div className="text-right font-mono">{percentageOfParent}%</div>

                          <div className="col-span-2">
                            {/* Timeline visualization */}
                            <div>
                              <div className="h-[2px] w-full overflow-hidden bg-gray-800">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${percentageOfParent}%`,
                                    backgroundColor: parentColor,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      {collapsed
        ? null
        : props.span.children.length
          ? props.span.children.map(childSpan => {
              const span = {
                ...childSpan,
                // if the child span doesn't have a serviceName, use the parent's serviceName
                serviceName: childSpan.serviceName ?? props.span.serviceName,
              };

              return (
                <Node
                  key={span.id}
                  highlightedServiceName={props.highlightedServiceName}
                  leftPanelWidth={props.leftPanelWidth}
                  totalDuration={props.totalDuration}
                  span={span}
                  level={props.level + 1}
                  parentSpan={props.span}
                  groupLines={
                    isLastChild
                      ? // remove the last line if it's the last span from the group
                        props.groupLines.slice(0, -1).concat(false, true)
                      : props.groupLines.concat(true)
                  }
                  parentColor={color}
                  color={span.serviceName ? props.serviceNameToColorMap[span.serviceName] : color}
                  serviceNameToColorMap={props.serviceNameToColorMap}
                />
              );
            })
          : null}
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

function roundFloatToTwoDecimals(num: number) {
  return Math.round(num * 100) / 100;
}
