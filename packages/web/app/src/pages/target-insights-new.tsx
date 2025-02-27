import {
  ComponentPropsWithoutRef,
  ElementRef,
  forwardRef,
  Fragment,
  InputHTMLAttributes,
  ReactNode,
  useMemo,
  useState,
} from 'react';
import { formatDate } from 'date-fns';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  SearchIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDuration, formatNumber } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Link } from '@tanstack/react-router';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';

const chartData = [
  { date: '2024-04-01', requests: 222, failures: 15 },
  { date: '2024-04-02', requests: 97, failures: 18 },
  { date: '2024-04-03', requests: 167, failures: 12 },
  { date: '2024-04-04', requests: 242, failures: 26 },
  { date: '2024-04-05', requests: 373, failures: 29 },
  { date: '2024-04-06', requests: 301, failures: 34 },
  { date: '2024-04-07', requests: 245, failures: 18 },
  { date: '2024-04-08', requests: 409, failures: 32 },
  { date: '2024-04-09', requests: 59, failures: 11 },
  { date: '2024-04-10', requests: 261, failures: 19 },
  { date: '2024-04-11', requests: 327, failures: 35 },
  { date: '2024-04-12', requests: 292, failures: 21 },
  { date: '2024-04-13', requests: 342, failures: 38 },
  { date: '2024-04-14', requests: 137, failures: 22 },
  { date: '2024-04-15', requests: 120, failures: 17 },
  { date: '2024-04-16', requests: 138, failures: 19 },
  { date: '2024-04-17', requests: 446, failures: 36 },
  { date: '2024-04-18', requests: 364, failures: 41 },
  { date: '2024-04-19', requests: 243, failures: 18 },
  { date: '2024-04-20', requests: 89, failures: 15 },
  { date: '2024-04-21', requests: 137, failures: 20 },
  { date: '2024-04-22', requests: 224, failures: 17 },
  { date: '2024-04-23', requests: 138, failures: 23 },
  { date: '2024-04-24', requests: 387, failures: 29 },
  { date: '2024-04-25', requests: 215, failures: 25 },
  { date: '2024-04-26', requests: 75, failures: 13 },
  { date: '2024-04-27', requests: 383, failures: 42 },
  { date: '2024-04-28', requests: 122, failures: 18 },
  { date: '2024-04-29', requests: 315, failures: 24 },
  { date: '2024-04-30', requests: 454, failures: 38 },
  { date: '2024-05-01', requests: 165, failures: 22 },
  { date: '2024-05-02', requests: 293, failures: 31 },
  { date: '2024-05-03', requests: 247, failures: 19 },
  { date: '2024-05-04', requests: 385, failures: 42 },
  { date: '2024-05-05', requests: 481, failures: 39 },
  { date: '2024-05-06', requests: 498, failures: 52 },
  { date: '2024-05-07', requests: 388, failures: 30 },
  { date: '2024-05-08', requests: 149, failures: 21 },
  { date: '2024-05-09', requests: 227, failures: 18 },
  { date: '2024-05-10', requests: 293, failures: 33 },
  { date: '2024-05-11', requests: 335, failures: 27 },
  { date: '2024-05-12', requests: 197, failures: 24 },
  { date: '2024-05-13', requests: 197, failures: 16 },
  { date: '2024-05-14', requests: 448, failures: 49 },
  { date: '2024-05-15', requests: 473, failures: 38 },
  { date: '2024-05-16', requests: 338, failures: 40 },
  { date: '2024-05-17', requests: 499, failures: 42 },
  { date: '2024-05-18', requests: 315, failures: 35 },
  { date: '2024-05-19', requests: 235, failures: 18 },
  { date: '2024-05-20', requests: 177, failures: 23 },
  { date: '2024-05-21', requests: 82, failures: 14 },
  { date: '2024-05-22', requests: 81, failures: 12 },
  { date: '2024-05-23', requests: 252, failures: 29 },
  { date: '2024-05-24', requests: 294, failures: 22 },
  { date: '2024-05-25', requests: 201, failures: 25 },
  { date: '2024-05-26', requests: 213, failures: 17 },
  { date: '2024-05-27', requests: 420, failures: 46 },
  { date: '2024-05-28', requests: 233, failures: 19 },
  { date: '2024-05-29', requests: 78, failures: 13 },
  { date: '2024-05-30', requests: 340, failures: 28 },
  { date: '2024-05-31', requests: 178, failures: 23 },
  { date: '2024-06-01', requests: 178, failures: 20 },
  { date: '2024-06-02', requests: 470, failures: 41 },
  { date: '2024-06-03', requests: 103, failures: 16 },
  { date: '2024-06-04', requests: 439, failures: 38 },
  { date: '2024-06-05', requests: 88, failures: 14 },
  { date: '2024-06-06', requests: 294, failures: 25 },
  { date: '2024-06-07', requests: 323, failures: 37 },
  { date: '2024-06-08', requests: 385, failures: 32 },
  { date: '2024-06-09', requests: 438, failures: 48 },
  { date: '2024-06-10', requests: 155, failures: 20 },
  { date: '2024-06-11', requests: 92, failures: 15 },
  { date: '2024-06-12', requests: 492, failures: 42 },
  { date: '2024-06-13', requests: 81, failures: 13 },
  { date: '2024-06-14', requests: 426, failures: 38 },
  { date: '2024-06-15', requests: 307, failures: 35 },
  { date: '2024-06-16', requests: 371, failures: 31 },
  { date: '2024-06-17', requests: 475, failures: 52 },
  { date: '2024-06-18', requests: 107, failures: 17 },
  { date: '2024-06-19', requests: 341, failures: 29 },
  { date: '2024-06-20', requests: 408, failures: 45 },
  { date: '2024-06-21', requests: 169, failures: 21 },
  { date: '2024-06-22', requests: 317, failures: 27 },
  { date: '2024-06-23', requests: 480, failures: 53 },
  { date: '2024-06-24', requests: 132, failures: 18 },
  { date: '2024-06-25', requests: 141, failures: 19 },
  { date: '2024-06-26', requests: 434, failures: 38 },
  { date: '2024-06-27', requests: 448, failures: 49 },
  { date: '2024-06-28', requests: 149, failures: 20 },
  { date: '2024-06-29', requests: 103, failures: 16 },
  { date: '2024-06-30', requests: 446, failures: 40 },
];

const chartConfig = {
  requests: {
    label: 'Requests',
    color: 'hsl(var(--chart-1))',
  },
  failures: {
    label: 'Errors',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

function Traffic() {
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>('requests');
  const total = useMemo(
    () => ({
      requests: chartData.reduce((acc, curr) => acc + curr.requests, 0),
      failures: chartData.reduce((acc, curr) => acc + curr.failures, 0),
    }),
    [],
  );
  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Requests</CardTitle>
          <CardDescription>Traffic and request statistics for the selected time</CardDescription>
        </div>
        <div className="flex">
          {['requests', 'failures'].map(key => {
            const chart = key as keyof typeof chartConfig;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">{chartConfig[chart].label}</span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
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
            <YAxis
              dataKey={activeChart}
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={value => String(formatNumber(value))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey={activeChart}
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
            <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

type Trace = {
  id: string;
  timestamp: string;
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

const data: Trace[] = [
  {
    id: '1',
    timestamp: '2024-04-01 12:00:00',
    status: 'ok',
    duration: 6019,
    kind: 'query',
    operationName: 'FetchProducts',
    operationHash: '3h1s',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['link', 'products', 'prices'],
  },
  {
    id: '2',
    timestamp: '2024-04-01 12:00:00',
    status: 'ok',
    duration: 6019,
    kind: 'query',
    operationName: 'FetchProducts',
    operationHash: '3h1s',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['link', 'products', 'prices'],
  },
  {
    id: '3',
    timestamp: '2024-04-01 12:01:00',
    status: 'error',
    duration: 10045,
    kind: 'mutation',
    operationName: 'UpdateProduct',
    operationHash: '8f2b',
    httpStatus: 500,
    httpMethod: 'POST',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['products'],
  },
  {
    id: '4',
    timestamp: '2024-04-01 12:02:30',
    status: 'ok',
    duration: 3045,
    kind: 'query',
    operationName: 'GetUser',
    operationHash: 'a7g4',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
  {
    id: '5',
    timestamp: '2024-04-01 12:03:15',
    status: 'ok',
    duration: 4521,
    kind: 'query',
    operationName: 'ListOrders',
    operationHash: 'c9h2',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['orders', 'users'],
  },
  {
    id: '6',
    timestamp: '2024-04-01 12:04:20',
    status: 'error',
    duration: 7890,
    kind: 'mutation',
    operationName: 'CancelOrder',
    operationHash: 'd1k8',
    httpStatus: 400,
    httpMethod: 'POST',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['orders'],
  },
  {
    id: '7',
    timestamp: '2024-04-01 12:05:05',
    status: 'ok',
    duration: 2156,
    kind: 'subscription',
    operationName: 'OrderStatusUpdated',
    operationHash: 'e4m7',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['orders'],
  },
  {
    id: '8',
    timestamp: '2024-04-01 12:06:45',
    status: 'ok',
    duration: 5092,
    kind: 'query',
    operationName: 'FetchCart',
    operationHash: 'f2p9',
    httpStatus: 200,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['cart', 'products'],
  },
  {
    id: '9',
    timestamp: '2024-04-01 12:07:30',
    status: 'ok',
    duration: 6820,
    kind: 'mutation',
    operationName: 'AddToCart',
    operationHash: 'g7r5',
    httpStatus: 201,
    httpMethod: 'POST',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['cart'],
  },
  {
    id: '10',
    timestamp: '2024-04-01 12:08:10',
    status: 'error',
    duration: 3502,
    kind: 'query',
    operationName: 'FetchUserProfile',
    operationHash: 'h3q6',
    httpStatus: 401,
    httpMethod: 'GET',
    httpHost: 'localhost:3000',
    httpRoute: '/graphql',
    httpUrl: 'http://localhost:3000/',
    subgraphNames: ['users'],
  },
];

export const columns: ColumnDef<Trace>[] = [
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
    cell: ({ row }) => (
      <div className="px-4 font-mono uppercase">
        {formatDate(row.getValue('timestamp'), 'MMM dd HH:mm:ss')}
      </div>
    ),
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
      <div className="flex items-center gap-2 px-4">
        <span className="text-muted-foreground font-mono">
          {row.original.operationHash.substring(0, 4)}
        </span>
        <span>{row.getValue('operationName')}</span>
      </div>
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
      const duration = formatDuration(row.getValue('duration'), true);
      return <div className="px-4 font-mono font-medium">{duration}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status');

      return (
        <Badge
          variant="outline"
          className={cn(
            'rounded-sm border-0 px-1 font-medium uppercase',
            status === 'ok' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400',
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'subgraphNames',
    sortingFn(a, b, isAsc) {
      // sort a.original.subgraphNames.length and b.original.subgraphNames.length
      const aValue = a.original.subgraphNames.length;
      const bValue = b.original.subgraphNames.length;

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
        <div className="text-center font-mono font-medium">
          {row.getValue('subgraphNames').length}
        </div>
      );
    },
  },
  {
    accessorKey: 'httpMethod',
    header: () => <div className="text-center">HTTP Method</div>,
    cell: ({ row }) => {
      return <div className="text-center font-mono font-medium">{row.getValue('httpMethod')}</div>;
    },
  },
  {
    accessorKey: 'httpStatus',
    header: () => <div className="text-center">HTTP Status</div>,
    cell: ({ row }) => {
      return <div className="text-center font-mono font-medium">{row.getValue('httpStatus')}</div>;
    },
  },
  {
    accessorKey: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-sans">
          <Button asChild variant="link">
            <Link to="/$organizationSlug/$projectSlug/$targetSlug/insights-new/trace">
              View Trace
            </Link>
          </Button>
        </div>
      );
    },
  },
];

function TracesList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
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
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {/* <Link> */}
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="font-mono [&:has([role=checkbox])]:pl-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  {/* </Link> */}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
    </>
  );
}

function FilterSearch() {
  return (
    <div className="mt-4 flex w-full max-w-sm items-center space-x-2">
      <FilterInput type="text" placeholder="Search values" />
    </div>
  );
}

function Filter(props: { name: string; items: ReactNode[]; hideSearch?: boolean }) {
  return (
    <Fragment key={props.name}>
      <SidebarGroup key={props.name} className="py-0">
        <Collapsible className="group/collapsible">
          <SidebarGroupLabel
            asChild
            className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-sm"
          >
            <CollapsibleTrigger>
              {props.name}{' '}
              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {!props.hideSearch && <FilterSearch />}
                {props.items.map((item, index) => (
                  <SidebarMenuButton>
                    <div
                      data-active={index < 2}
                      className="group/filter-item border-sidebar-border text-sidebar-primary-foreground data-[active=true]:border-sidebar-primary data-[active=true]:bg-sidebar-primary flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border"
                    >
                      <Check className="hidden size-3 group-data-[active=true]/filter-item:block" />
                    </div>
                    {item}
                  </SidebarMenuButton>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
    </Fragment>
  );
}

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

const DoubleSlider = forwardRef<
  ElementRef<typeof SliderPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-800">
      <SliderPrimitive.Range className="absolute h-full bg-gray-400" />
    </SliderPrimitive.Track>
    {props.value?.map((_, index) => (
      <SliderPrimitive.Thumb
        key={index}
        className="block h-4 w-4 rounded-full border border-gray-700 bg-gray-800 transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      />
    ))}
  </SliderPrimitive.Root>
));
DoubleSlider.displayName = 'DoubleSlider';

interface FilterInputProps extends InputHTMLAttributes<HTMLInputElement> {}

const FilterInput = forwardRef<HTMLInputElement, FilterInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
FilterInput.displayName = 'Input';

function DurationFilter() {
  const [values, setValues] = useState([6019, 100000]);

  const handleSliderChange = (newValues: number[]) => {
    setValues(newValues);
  };

  const handleInputChange = (index: number, value: string) => {
    const numValue = Number.parseFloat(value) || 0;
    const newValues = [...values];
    newValues[index] = Math.min(Math.max(numValue, 0), 100000);
    setValues(newValues);
  };

  return (
    <Fragment>
      <SidebarGroup className="py-0">
        <Collapsible className="group/collapsible">
          <SidebarGroupLabel
            asChild
            className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-sm"
          >
            <CollapsibleTrigger>
              Duration{' '}
              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <div className="space-y-6 rounded-lg bg-zinc-950 p-2">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="font-mono text-xs text-zinc-400">MIN</label>
                      <div className="relative">
                        <FilterInput
                          type="number"
                          value={values[0].toFixed(2)}
                          onChange={e => handleInputChange(0, e.target.value)}
                          className="h-7 border-zinc-800 bg-transparent px-2 pr-8 font-mono text-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-400">
                          ms
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-xs text-zinc-400">MAX</label>
                      <div className="relative">
                        <FilterInput
                          type="number"
                          value={values[1].toFixed(2)}
                          onChange={e => handleInputChange(1, e.target.value)}
                          className="h-7 border-zinc-800 bg-transparent px-2 pr-8 font-mono text-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-400">
                          ms
                        </span>
                      </div>
                    </div>
                  </div>
                  <DoubleSlider
                    defaultValue={[6019, 100000]}
                    max={100000}
                    min={0}
                    step={1}
                    value={values}
                    onValueChange={handleSliderChange}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                  />
                </div>
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
    </Fragment>
  );
}

function Filters() {
  return (
    <>
      <DurationFilter />
      <Filter
        name="Status"
        hideSearch
        items={[
          <LabelWithColor className="bg-green-600">Ok</LabelWithColor>,
          <LabelWithColor className="bg-red-600">Error</LabelWithColor>,
        ]}
      />
      <Filter name="Operation Kind" hideSearch items={['Query', 'Mutation', 'Subscription']} />
      <Filter name="Subgraph Name" items={['link', 'products', 'prices']} />
      <Filter
        name="Operation Name"
        items={[
          <LabelWithBadge badgeText="3h1s">FetchProducts</LabelWithBadge>,
          <LabelWithBadge badgeText="7na1">FetchUsers</LabelWithBadge>,
          <LabelWithBadge badgeText="64a1">FetchProducts</LabelWithBadge>,
        ]}
      />
      <Filter
        name="Client"
        items={[
          'unknown',
          'hive-app',
          'Hive CLI',
          'Hive Client',
          <LabelWithBadge side="right" badgeText="0.46.0">
            Hive CLI
          </LabelWithBadge>,
          <LabelWithBadge side="right" badgeText="0.25.3">
            Hive Client
          </LabelWithBadge>,
        ]}
      />
      <Filter name="HTTP Status Code" items={['200', '400', '500']} />
      <Filter name="HTTP Method" hideSearch items={['POST', 'GET']} />
      <Filter name="HTTP Host" items={['localhost:4000', 'localhost:4200', 'localhost:3000']} />
      <Filter name="HTTP Route" items={['/graphql', '/']} />
      <Filter
        name="HTTP URL"
        items={[
          'http://localhost:3000/',
          'http://localhost:4000/graphql',
          'http://localhost:4200/graphql',
        ]}
      />
    </>
  );
}

function Content() {
  return (
    <div>
      <Traffic />
    </div>
  );
}

function TargetInsightsNewPageContent() {
  return (
    <div className="py-6">
      <SidebarProvider>
        <Sidebar collapsible="none" className="bg-transparent">
          <SidebarContent>
            <SidebarGroupLabel>Filters</SidebarGroupLabel>
            <Filters />
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="bg-transparent">
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Content />
            <TracesList />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export function TargetInsightsNewPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="Insights" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Insights}
      >
        <TargetInsightsNewPageContent />
      </TargetLayout>
    </>
  );
}
