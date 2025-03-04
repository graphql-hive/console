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
  AlertTriangle,
  ArrowUpDown,
  ArrowUpDownIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLinkIcon,
  MoreHorizontal,
  SearchIcon,
  X,
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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  { date: '2024-04-01', traces: 222, exceptions: 15 },
  { date: '2024-04-02', traces: 97, exceptions: 18 },
  { date: '2024-04-03', traces: 167, exceptions: 12 },
  { date: '2024-04-04', traces: 242, exceptions: 26 },
  { date: '2024-04-05', traces: 373, exceptions: 29 },
  { date: '2024-04-06', traces: 301, exceptions: 34 },
  { date: '2024-04-07', traces: 245, exceptions: 18 },
  { date: '2024-04-08', traces: 409, exceptions: 32 },
  { date: '2024-04-09', traces: 59, exceptions: 11 },
  { date: '2024-04-10', traces: 261, exceptions: 19 },
  { date: '2024-04-11', traces: 327, exceptions: 35 },
  { date: '2024-04-12', traces: 292, exceptions: 21 },
  { date: '2024-04-13', traces: 342, exceptions: 38 },
  { date: '2024-04-14', traces: 137, exceptions: 22 },
  { date: '2024-04-15', traces: 120, exceptions: 17 },
  { date: '2024-04-16', traces: 138, exceptions: 19 },
  { date: '2024-04-17', traces: 446, exceptions: 36 },
  { date: '2024-04-18', traces: 364, exceptions: 41 },
  { date: '2024-04-19', traces: 243, exceptions: 18 },
  { date: '2024-04-20', traces: 89, exceptions: 15 },
  { date: '2024-04-21', traces: 137, exceptions: 20 },
  { date: '2024-04-22', traces: 224, exceptions: 17 },
  { date: '2024-04-23', traces: 138, exceptions: 23 },
  { date: '2024-04-24', traces: 387, exceptions: 29 },
  { date: '2024-04-25', traces: 215, exceptions: 25 },
  { date: '2024-04-26', traces: 75, exceptions: 13 },
  { date: '2024-04-27', traces: 383, exceptions: 42 },
  { date: '2024-04-28', traces: 122, exceptions: 18 },
  { date: '2024-04-29', traces: 315, exceptions: 24 },
  { date: '2024-04-30', traces: 454, exceptions: 38 },
  { date: '2024-05-01', traces: 165, exceptions: 22 },
  { date: '2024-05-02', traces: 293, exceptions: 31 },
  { date: '2024-05-03', traces: 247, exceptions: 19 },
  { date: '2024-05-04', traces: 385, exceptions: 42 },
  { date: '2024-05-05', traces: 481, exceptions: 39 },
  { date: '2024-05-06', traces: 498, exceptions: 52 },
  { date: '2024-05-07', traces: 388, exceptions: 30 },
  { date: '2024-05-08', traces: 149, exceptions: 21 },
  { date: '2024-05-09', traces: 227, exceptions: 18 },
  { date: '2024-05-10', traces: 293, exceptions: 33 },
  { date: '2024-05-11', traces: 335, exceptions: 27 },
  { date: '2024-05-12', traces: 197, exceptions: 24 },
  { date: '2024-05-13', traces: 197, exceptions: 16 },
  { date: '2024-05-14', traces: 448, exceptions: 49 },
  { date: '2024-05-15', traces: 473, exceptions: 38 },
  { date: '2024-05-16', traces: 338, exceptions: 40 },
  { date: '2024-05-17', traces: 499, exceptions: 42 },
  { date: '2024-05-18', traces: 315, exceptions: 35 },
  { date: '2024-05-19', traces: 235, exceptions: 18 },
  { date: '2024-05-20', traces: 177, exceptions: 23 },
  { date: '2024-05-21', traces: 82, exceptions: 14 },
  { date: '2024-05-22', traces: 81, exceptions: 12 },
  { date: '2024-05-23', traces: 252, exceptions: 29 },
  { date: '2024-05-24', traces: 294, exceptions: 22 },
  { date: '2024-05-25', traces: 201, exceptions: 25 },
  { date: '2024-05-26', traces: 213, exceptions: 17 },
  { date: '2024-05-27', traces: 420, exceptions: 46 },
  { date: '2024-05-28', traces: 233, exceptions: 19 },
  { date: '2024-05-29', traces: 78, exceptions: 13 },
  { date: '2024-05-30', traces: 340, exceptions: 28 },
  { date: '2024-05-31', traces: 178, exceptions: 23 },
  { date: '2024-06-01', traces: 178, exceptions: 20 },
  { date: '2024-06-02', traces: 470, exceptions: 41 },
  { date: '2024-06-03', traces: 103, exceptions: 16 },
  { date: '2024-06-04', traces: 439, exceptions: 38 },
  { date: '2024-06-05', traces: 88, exceptions: 14 },
  { date: '2024-06-06', traces: 294, exceptions: 25 },
  { date: '2024-06-07', traces: 323, exceptions: 37 },
  { date: '2024-06-08', traces: 385, exceptions: 32 },
  { date: '2024-06-09', traces: 438, exceptions: 48 },
  { date: '2024-06-10', traces: 155, exceptions: 20 },
  { date: '2024-06-11', traces: 92, exceptions: 15 },
  { date: '2024-06-12', traces: 492, exceptions: 42 },
  { date: '2024-06-13', traces: 81, exceptions: 13 },
  { date: '2024-06-14', traces: 426, exceptions: 38 },
  { date: '2024-06-15', traces: 307, exceptions: 35 },
  { date: '2024-06-16', traces: 371, exceptions: 31 },
  { date: '2024-06-17', traces: 475, exceptions: 52 },
  { date: '2024-06-18', traces: 107, exceptions: 17 },
  { date: '2024-06-19', traces: 341, exceptions: 29 },
  { date: '2024-06-20', traces: 408, exceptions: 45 },
  { date: '2024-06-21', traces: 169, exceptions: 21 },
  { date: '2024-06-22', traces: 317, exceptions: 27 },
  { date: '2024-06-23', traces: 480, exceptions: 53 },
  { date: '2024-06-24', traces: 132, exceptions: 18 },
  { date: '2024-06-25', traces: 141, exceptions: 19 },
  { date: '2024-06-26', traces: 434, exceptions: 38 },
  { date: '2024-06-27', traces: 448, exceptions: 49 },
  { date: '2024-06-28', traces: 149, exceptions: 20 },
  { date: '2024-06-29', traces: 103, exceptions: 16 },
  { date: '2024-06-30', traces: 446, exceptions: 40 },
];

const chartConfig = {
  traces: {
    label: 'Traces',
    color: 'hsl(var(--chart-1))',
  },
  exceptions: {
    label: 'Exceptions',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

function Traffic() {
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>('traces');
  const total = useMemo(
    () => ({
      traces: chartData.reduce((acc, curr) => acc + curr.traces, 0),
      exceptions: chartData.reduce((acc, curr) => acc + curr.exceptions, 0),
    }),
    [],
  );
  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Traces</CardTitle>
          <CardDescription>Request traces for the selected time</CardDescription>
        </div>
        <div className="flex">
          {['traces', 'exceptions'].map(key => {
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
      <div className="px-4 font-mono text-xs uppercase">
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
      <div className="flex items-center gap-2 px-4 text-xs">
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
      return <div className="px-4 font-mono text-xs font-medium">{duration}</div>;
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
            'rounded-sm border-0 px-1 text-xs font-medium uppercase',
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
        <div className="text-center font-mono text-xs font-medium">
          {row.getValue('subgraphNames').length}
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
    accessorKey: 'httpStatus',
    header: () => <div className="text-center">HTTP Status</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-mono text-xs font-medium">
          {row.getValue('httpStatus')}
        </div>
      );
    },
  },
  {
    accessorKey: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: () => {
      return (
        <div className="text-center font-sans text-xs">
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
  const [traceInSheet, setTraceInSheet] = useState<Trace | null>(data[0]);

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
      <TraceSheet trace={traceInSheet} />
    </Sheet>
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

interface TraceAttribute {
  name: string;
  value: string | number | ReactNode;
  category?: string;
}

function TraceSheet({ trace }: { trace: Trace | null }) {
  const [activeView, setActiveView] = useState<'attributes' | 'events'>('attributes');

  if (!trace) {
    return null;
  }

  const attributes: Array<TraceAttribute> = [
    {
      name: 'graphql.operationKind',
      value: trace.kind,
      category: 'GraphQL',
    },
    {
      name: 'graphql.subgraphs',
      value: trace.subgraphNames.join(', '),
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
      value: trace.httpStatus,
      category: 'HTTP',
    },
  ];

  return (
    <SheetContent className="border-l border-gray-800 bg-black p-0 text-white md:max-w-[50%]">
      <TooltipProvider>
        <SheetHeader className="relative border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-medium text-white">
              {trace.operationName}
              <span className="text-muted-foreground ml-2 font-mono font-normal">
                {trace.operationHash.substring(0, 4)}
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
                trace.status === 'ok'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400',
              )}
            >
              {trace.status}
            </Badge>
            <span className="font-mono uppercase text-gray-300">
              {formatDate(trace.timestamp, 'MMM dd HH:mm:ss')}
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/insights-new/trace"
              className="absolute bottom-4 right-4"
            >
              <ExternalLinkIcon className="mr-1 h-3 w-3" />
              Full Trace
            </Link>
          </Button>
        </SheetHeader>
        <div className="h-[calc(100vh-113px)]">
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
              <div className="flex h-full flex-col">
                <div className="sticky top-0 z-10 border-b border-gray-800">
                  <div className="flex w-full items-center text-xs text-white">
                    <div className="h-12 w-1/3 shrink-0 py-2">
                      <div className="pl-4">
                        <div className="font-medium">Timeline</div>
                        <div className="text-xs text-gray-500">Spans and details</div>
                      </div>
                    </div>
                    <div className="h-12 grow pr-8">
                      <div className="relative h-full w-full">
                        <div className="absolute left-0 top-6 -translate-x-1/2 text-center">
                          0ms
                        </div>
                        <div className="absolute bottom-0 left-0 h-2 w-px bg-[#27272a]" />
                        <div className="absolute left-[25%] top-6 -translate-x-1/2 text-center">
                          2.03ms
                        </div>
                        <div className="absolute bottom-0 left-[25%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
                        <div className="absolute left-[50%] top-6 -translate-x-1/2 text-center">
                          4.06ms
                        </div>
                        <div className="absolute bottom-0 left-[50%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
                        <div className="absolute left-[75%] top-6 -translate-x-1/2 text-center">
                          6.09ms
                        </div>
                        <div className="absolute bottom-0 left-[75%] h-2 w-px -translate-x-1/2 bg-[#27272a]" />
                        <div className="absolute right-0 top-6 translate-x-1/2 text-center">
                          8.12ms
                        </div>
                        <div className="absolute bottom-0 right-0 h-2 w-px -translate-x-1/2 bg-[#27272a]" />
                      </div>
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-grow">
                  <div>
                    <TraceTree />
                    {/* <Span
                      title="FetchProducts"
                      description="gateway"
                      topWidthPercentage={33.33}
                      spanLeftPercentage={0}
                      spanWidthPercentage={100}
                      icon={<FirstSpanIcon />}
                      duration={8.12}
                      startedAt={0}
                      endedAt={8.12}
                      totalDutation={8.12}
                      onClick={() => {}}
                    />

                    <Span
                      title="subgraph"
                      description="products"
                      topWidthPercentage={33.33}
                      spanLeftPercentage={20}
                      spanWidthPercentage={60}
                      icon={<SecondSpanIcon />}
                      duration={4.06}
                      startedAt={2.03}
                      endedAt={6.09}
                      totalDutation={8.12}
                      onClick={() => {}}
                    />
                    <Span
                      title="subgraph"
                      description="prices"
                      topWidthPercentage={33.33}
                      spanLeftPercentage={50}
                      spanWidthPercentage={25}
                      icon={<ThirdSpanIcon />}
                      duration={2.03}
                      startedAt={4.06}
                      endedAt={6.09}
                      totalDutation={8.12}
                      onClick={() => {}}
                    /> */}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={10} maxSize={80}>
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
                  </div>
                </div>
                <ScrollArea className="flex-grow">
                  <div>
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
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </TooltipProvider>
    </SheetContent>
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

//

function TraceTree() {
  const totalDuration = 8.12;
  const leftPanelWidth = 251;
  const rootSpan: SpanProps = {
    id: 'root',
    title: 'FetchProducts',
    description: 'gateway',
    duration: totalDuration,
    totalDuration,
    startedAt: 0,
    children: [
      {
        id: '213hbsdgs',
        title: 'subgraph',
        description: 'products',
        duration: 4.06,
        totalDuration,
        startedAt: 2.3,
        children: [
          {
            id: '138sndhs',
            title: 'parse',
            duration: 0.1,
            totalDuration,
            startedAt: 2.4,
            children: [],
          },
          {
            id: '1n1bsxs1',
            title: 'validate',
            duration: 0.9,
            totalDuration,
            startedAt: 2.5,
            children: [],
          },
        ],
      },
      {
        id: '1n23sxs1',
        title: 'subgraph',
        description: 'prices',
        duration: 2.03,
        totalDuration,
        startedAt: 4.06,
        children: [
          {
            id: '19nxb23b',
            title: 'parse',
            duration: 0.1,
            totalDuration,
            startedAt: 4.1,
            children: [],
          },
          {
            id: '284bsdb1',
            title: 'validate',
            duration: 1.2,
            totalDuration,
            startedAt: 4.2,
            children: [
              {
                id: '284bsdb1',
                title: 'async validation',
                description: 'backend validation of prices',
                duration: 0.2,
                totalDuration,
                startedAt: 5.4,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  return (
    <div>
      <Node
        key={rootSpan.id}
        level={0}
        leftPanelWidth={leftPanelWidth}
        span={rootSpan}
        parentSpan={null}
        groupLines={[]}
      />
    </div>
  );
}

type SpanProps = {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalDuration: number;
  startedAt: number;
  children: SpanProps[];
};

type NodeProps = {
  level: number;
  leftPanelWidth: number;
  span: SpanProps;
  parentSpan: SpanProps | null;
  groupLines: boolean[];
};

function countChildren(spans: SpanProps[]): number {
  return spans.reduce((acc, span) => acc + countChildren(span.children), spans.length);
}

const colors = ['#2662d8', '#2eb88a', '#e88d30', '#af56db'];
function Node(props: NodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const leftPositionPercentage = roundFloatToTwoDecimals(
    (props.span.startedAt / props.span.totalDuration) * 100,
  );
  const widthPercentage = roundFloatToTwoDecimals(
    (props.span.duration / props.span.totalDuration) * 100,
  );

  const isNearRightEdge = leftPositionPercentage + widthPercentage > 85;

  const isLastChild =
    props.parentSpan?.children[props.parentSpan.children.length - 1] === props.span;

  const childrenCount = collapsed
    ? countChildren(props.span.children) + 1
    : props.span.children.length;
  const canBeCollapsed = props.span.children.length > 0;
  const color = colors[props.level % colors.length];

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
            <div className="whitespace-nowrap text-xs text-white">{props.span.title}</div>
            {props.span.description ? (
              <div className="overflow-hidden overflow-ellipsis whitespace-nowrap text-xs text-gray-500">
                {props.span.description}
              </div>
            ) : null}
          </div>
          <div className="relative flex h-full grow items-center overflow-hidden">
            <div
              className={cn('absolute block h-6 min-w-[1px] select-none rounded-sm')}
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
          </div>
        </div>
      </div>
      {collapsed
        ? null
        : props.span.children.length
          ? props.span.children.map(span => (
              <Node
                leftPanelWidth={props.leftPanelWidth}
                span={span}
                level={props.level + 1}
                key={span.id}
                parentSpan={props.span}
                groupLines={
                  isLastChild
                    ? // remove the last line if it's the last span from the group
                      props.groupLines.slice(0, -1).concat(false, true)
                    : props.groupLines.concat(true)
                }
              />
            ))
          : null}
    </>
  );
}

function roundFloatToTwoDecimals(num: number) {
  return Math.round(num * 100) / 100;
}
