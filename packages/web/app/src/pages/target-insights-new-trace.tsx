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
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Search,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDuration, formatNumber } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Link } from '@tanstack/react-router';

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
            <div className="flex h-screen flex-col bg-[#121212] text-gray-200">
              {/* Header */}
              <div className="border-b border-gray-800">
                <div className="flex items-center gap-2 p-2">
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-200">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Trace ID</span>
                    <span className="font-mono">6bdd1c9219d65af865e8282f4ee55c65</span>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-sm">Total Spans</span>
                      <span className="text-xl font-bold">11</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm">Error Spans</span>
                      <span className="text-xl font-bold">0</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <input type="checkbox" id="span-details" className="accent-blue-500" checked />
                    <label htmlFor="span-details" className="text-sm">
                      Span Details
                    </label>
                  </div>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-200">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="inline-block flex h-4 w-4 items-center justify-center rounded bg-gray-700">
                        <span className="inline-block h-2 w-2 rounded bg-gray-400"></span>
                      </span>
                      my-gateway
                    </span>
                    <span className="text-gray-500">—</span>
                    <span className="rounded bg-gray-800 px-2 py-0.5">POST /graphql</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block flex h-4 w-4 items-center justify-center rounded-full bg-gray-800">
                      <span className="inline-block h-2 w-2 rounded-full border-2 border-gray-400"></span>
                    </span>
                    <span>16 ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block flex h-4 w-4 items-center justify-center rounded-full bg-gray-800">
                      <span className="inline-block h-2 w-2 rounded-full border-2 border-gray-400"></span>
                    </span>
                    <span>Feb 25, 2025 — 11:38:13</span>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left and Center Panels */}
                <div className="flex-1 overflow-auto">
                  {/* Flamegraph Section */}
                  <div className="border-b border-gray-800">
                    <div className="flex items-center gap-2 p-2">
                      <Button variant="ghost" className="gap-2 text-sm hover:bg-gray-800">
                        <span className="inline-block flex h-4 w-4 items-center justify-center rounded bg-gray-700">
                          <span className="inline-block h-2 w-2 rounded bg-gray-400"></span>
                        </span>
                        Flamegraph
                      </Button>
                    </div>

                    <div className="grid grid-cols-[1fr,2fr] gap-4 p-4">
                      <div className="flex items-center justify-between rounded bg-gray-800 p-2">
                        <span className="text-gray-400">% exec time</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="h-4 rounded bg-[#5bbcd6]"></div>
                        <div className="h-4 rounded bg-[#5bbcd6]"></div>
                      </div>
                    </div>

                    <div className="flex items-center px-4 pb-4">
                      <div className="mr-2 h-6 w-6 rounded bg-red-500"></div>
                      <span>my-gateway</span>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="h-2 w-16 rounded bg-green-500"></div>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <div className="relative h-4">
                        <div className="absolute inset-0 flex justify-between">
                          <span>0ms</span>
                          <span>3ms</span>
                          <span>6ms</span>
                          <span>9ms</span>
                          <span>12ms</span>
                          <span>16ms</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Filter */}
                  <div className="p-4">
                    <Input
                      className="border-gray-700 bg-gray-900 text-gray-300 placeholder:text-gray-500"
                      placeholder={`Search Filter : select options from suggested values, for IN/NOT IN operators - press "Enter" after selecting options`}
                    />
                  </div>

                  {/* Spans Tree */}
                  <div className="p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      <span className="font-bold">11</span>
                      <span className="rounded bg-gray-800 px-2 py-0.5">POST /graphql</span>
                    </div>

                    {/* Span Items */}
                    <div className="space-y-4">
                      {/* POST /graphql */}
                      <div className="border-l-2 border-gray-700 pl-4">
                        <div className="flex items-center">
                          <span className="w-24">my-gateway</span>
                          <div className="mx-4 flex-1">
                            <div className="h-4 w-full rounded-sm bg-[#5bbcd6]"></div>
                          </div>
                          <span className="w-16 text-right">16.69 ms</span>
                        </div>
                      </div>

                      {/* graphql.execute */}
                      <div className="border-l-2 border-gray-700 pl-4">
                        <div className="flex items-center">
                          <span className="flex w-24 items-center gap-1">
                            <span className="inline-block h-4 w-4 rounded-full bg-gray-700"></span>
                            graphql.execute
                          </span>
                          <div className="mx-4 flex-1">
                            <div className="h-4 w-full rounded-sm bg-[#5bbcd6]"></div>
                          </div>
                          <span className="w-16 text-right">16.24 ms</span>
                        </div>
                        <div className="mt-1 border-l-2 border-gray-700 pl-4">
                          <span className="w-24">my-gateway</span>
                        </div>
                      </div>

                      {/* graphql.parse */}
                      <div className="border-l-2 border-gray-700 pl-4">
                        <div className="flex items-center">
                          <span className="flex w-24 items-center gap-1">
                            <span className="inline-block h-4 w-4 rounded-full bg-gray-700"></span>
                            graphql.parse
                          </span>
                          <div className="mx-4 flex-1">
                            <div className="h-4 w-[2%] rounded-sm bg-[#5bbcd6]"></div>
                          </div>
                          <span className="w-16 text-right">0.03 ms</span>
                        </div>
                        <div className="mt-1 border-l-2 border-gray-700 pl-4">
                          <span className="w-24">my-gateway</span>
                        </div>
                      </div>

                      {/* graphql.validate */}
                      <div className="border-l-2 border-gray-700 pl-4">
                        <div className="flex items-center">
                          <span className="flex w-24 items-center gap-1">
                            <span className="inline-block h-4 w-4 rounded-full bg-gray-700"></span>
                            graphql.validate
                          </span>
                          <div className="mx-4 flex-1">
                            <div className="h-4 w-[1%] rounded-sm bg-[#5bbcd6]"></div>
                          </div>
                          <span className="w-16 text-right">0.02 ms</span>
                        </div>
                        <div className="mt-1 border-l-2 border-gray-700 pl-4">
                          <span className="w-24">my-gateway</span>
                        </div>
                      </div>

                      {/* subgraph.execute */}
                      <div className="border-l-2 border-gray-700 pl-4">
                        <div className="flex items-center">
                          <span className="flex w-24 items-center gap-1">
                            <span className="inline-block h-4 w-4 rounded-full bg-gray-700"></span>
                            subgraph.execute (products)
                          </span>
                          <div className="mx-4 flex-1">
                            <div className="h-4 w-[20%] rounded-sm bg-[#5bbcd6]"></div>
                          </div>
                          <span className="w-16 text-right">3.35 ms</span>
                        </div>
                        <div className="mt-1 border-l-2 border-gray-700 pl-4">
                          <span className="w-24">my-gateway</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Span Details */}
                <div className="w-80 overflow-auto border-l border-gray-800">
                  <div className="space-y-6 p-4">
                    <div>
                      <h3 className="mb-2 text-xs text-gray-500">SPAN NAME</h3>
                      <div className="rounded bg-gray-800 p-2">subgraph.execute (list)</div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs text-gray-500">SPAN ID</h3>
                      <div className="rounded bg-gray-800 p-2 font-mono text-sm">
                        cba5a169850884d6
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs text-gray-500">START TIME</h3>
                      <div className="rounded bg-gray-800 p-2">Feb 25, 2025 — 11:38:13</div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs text-gray-500">DURATION</h3>
                      <div className="rounded bg-gray-800 p-2">1.8 ms</div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs text-gray-500">SERVICE</h3>
                      <div className="flex items-center gap-2 rounded bg-gray-800 p-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                        my-gateway
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs text-gray-500">SPAN KIND</h3>
                      <div className="rounded bg-gray-800 p-2">Client</div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs text-gray-500">STATUS CODE STRING</h3>
                      <div className="rounded bg-gray-800 p-2">Ok</div>
                    </div>

                    <Button className="w-full bg-gray-800 text-gray-300 hover:bg-gray-700">
                      Go to related logs
                    </Button>

                    <Tabs defaultValue="attributes">
                      <TabsList className="w-full justify-start gap-8 border-b border-gray-700 bg-transparent pb-2">
                        <TabsTrigger
                          value="attributes"
                          className="rounded-none bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                        >
                          Attributes
                        </TabsTrigger>
                        <TabsTrigger
                          value="events"
                          className="rounded-none bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                        >
                          Events
                        </TabsTrigger>
                        <div className="ml-auto">
                          <Search className="h-4 w-4" />
                        </div>
                      </TabsList>

                      <TabsContent value="attributes" className="mt-4">
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm">gateway.upstream.subgraph.name</div>
                            <div className="mt-1 rounded bg-gray-800 p-2">list</div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="events">
                        <div className="p-4 text-center text-gray-500">No events</div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            </div>
            )
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export function TargetInsightsNewTracePage(props: {
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
