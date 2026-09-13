import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleXIcon,
  EraserIcon,
  MoveDownIcon,
  SearchIcon,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button as BaseButton } from '@/components/base/button/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Collapsible as BaseCollapsible } from '@/components/base/collapsible/collapsible';
import { Select } from '@/components/base/floating/select/select';
import { ScrollArea as BaseScrollArea } from '@/components/base/scroll-area/scroll-area';
import { Separator as BaseSeparator } from '@/components/base/separator/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
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
import { Accordion as V2Accordion } from '@/components/v2/accordion';
import { TBody, Td, Th, THead, Tr, Table as V2Table } from '@/components/v2/table';
import { formatNumber } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/DataLayout';

/**
 * Tables, tabs, accordions and the three small layout primitives.
 *
 * Two table implementations and two accordion implementations ship at once, and they are not
 * variants of each other: `v2/THead` wraps its children in a `<tr>` for you while `ui/TableHeader`
 * expects an explicit `TableRow`, so the call-site shapes differ structurally, not just visually.
 *
 * Counts are per importing file, since a naive `<Table` grep counts both implementations at once
 * (22 for each, when the real split is 11 and 17).
 */

const ENTRIES = [
  {
    source: '13 importing files: target-apps.tsx, access-tokens-table.tsx and 11 more',
    origin: 'ui',
    what: 'Table — 51 cells of which 39 carry a className, mostly alignment and responsive hiding',
    coveredBy: 'Tables',
  },
  {
    source: '40 importing files via the v2 barrel: channels-table.tsx, InvoicesList.tsx and more',
    origin: 'v2',
    what: 'Table — zebra striping baked into Tr, and THead supplies its own row',
    coveredBy: 'Tables',
  },
  {
    source:
      'target-laboratory.tsx:472, target-proposal.tsx:512, target-checks-single.tsx and 5 more',
    origin: 'ui',
    what: 'Tabs — 3 variants, and all 16 TabsLists carry a className',
    coveredBy: 'Tabs',
  },
  {
    source: 'members/permission-selector.tsx and 5 more',
    origin: 'ui',
    what: 'Accordion — named parts, plus AccordionHeader and a raw Trigger escape hatch',
    coveredBy: 'Accordions',
  },
  {
    source: 'pages/target.tsx and the v2 barrel',
    origin: 'v2',
    what: 'Accordion — an Object.assign compound, Accordion.Item / .Header / .Content',
    coveredBy: 'Accordions',
  },
  {
    source: 'target-checks-single.tsx:498, target-trace.tsx:107, target-trace.tsx:882',
    origin: 'ui',
    what: 'ScrollArea — 3 live sites (5 more were inside the Popover comboboxes that became Selects in round 3), every one setting its own height by className',
    coveredBy: 'ScrollArea',
  },
  {
    source: 'pages/organization.tsx:223, pages/project.tsx:236, ui/sidebar.tsx:367',
    origin: 'ui',
    what: 'Separator — 3 sites, 2 of them the same vertical toolbar divider; the third is the sidebar wrapper, deleted with the sidebar',
    coveredBy: 'Separator',
  },
  {
    source: 'pages/target-laboratory.tsx:730, pages/traces/target-traces-filter.tsx:304',
    origin: 'ui',
    what: 'Collapsible — a 9-line re-export of Radix with no styling of its own',
    coveredBy: 'Collapsible',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui + v2 table, tabs, accordion, scroll-area, separator, collapsible"
      summary={
        <>
          <strong>Two tables and two accordions, shipping together.</strong> ui/table has 11 tables,
          v2/table 17. They differ structurally: <code>v2/THead</code> renders its own{' '}
          <code>&lt;tr&gt;</code> around its children, <code>ui/TableHeader</code> requires an
          explicit <code>TableRow</code>. <code>v2/Tr</code> bakes in zebra striping (
          <code>odd:bg-neutral-8/10</code>) that ui has no equivalent for.
          <br />
          <br />
          <strong>Dead exports:</strong> <code>TableFooter</code>, <code>TableCaption</code>,{' '}
          <code>ScrollBar</code> — zero call sites each.
          <br />
          <br />
          <strong>className is the actual API here.</strong> 39 of 51 <code>TableCell</code>s carry
          one, 31 of 44 <code>TableHead</code>s, 31 of 36 <code>TabsTrigger</code>s, and{' '}
          <strong>16 of 16 TabsLists</strong> — not one Tabs call site accepts the component&apos;s
          own container styling. Cell alignment is written two ways for the same result:{' '}
          <code>text-right</code> 10 times and <code>text-end</code> 6.
          <br />
          <br />
          <strong>Tabs declares 3 variants</strong> (<code>default</code>, <code>menu</code>,{' '}
          <code>content</code>) and they are set on <code>TabsList</code>/<code>TabsTrigger</code>/
          <code>TabsContent</code> independently, so a call site can and does mix them. Two
          laboratory pages hold byte-identical tab blocks.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The two tables.
// ---------------------------------------------------------------------------

export const Tables = createPreview({
  label: 'Tables',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-apps.tsx:144"
        origin="ui"
        note="ui/table wraps the table in an overflow-auto div and styles by [&_tr] descendant selectors. Every cell here sets its own alignment or responsive visibility - hidden sm:table-cell, text-center - which is what 39 of the 51 TableCells in the app do."
      >
        <div className="w-[42rem]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead className="hidden w-[10%] text-center sm:table-cell">Status</TableHead>
                <TableHead className="w-[150px] text-center">Documents</TableHead>
                <TableHead className="hidden text-center sm:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: 'checkout-web', version: '1.4.2', docs: 128 },
                { name: 'admin-portal', version: '0.9.0', docs: 42 },
              ].map(app => (
                <TableRow key={app.name}>
                  <TableCell>
                    <span className="font-mono text-xs font-bold">
                      {app.name}@{app.version}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-center sm:table-cell">
                    <Badge className="text-xs" variant="secondary">
                      active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{app.docs}</TableCell>
                  <TableCell className="hidden text-center sm:table-cell">
                    <span className="text-xs">3 days ago</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CallSite>

      <CallSite
        source="components/project/alerts/channels-table.tsx:56"
        origin="v2"
        note="v2/table for comparison. Note the structural difference: THead takes the Th cells directly and supplies the <tr> itself, so there is no Tr in the header. Tr also carries odd:bg-neutral-8/10, so rows stripe with no call-site involvement - scroll both tables and the zebra is the obvious tell."
      >
        <div className="w-[42rem]">
          <V2Table>
            <THead>
              <Th>Name</Th>
              <Th>Endpoint</Th>
              <Th>Type</Th>
            </THead>
            <TBody>
              {[
                { name: 'Team Slack', endpoint: '#alerts', type: 'SLACK' },
                {
                  name: 'Ops webhook',
                  endpoint: 'https://ops.internal/hooks/hive',
                  type: 'WEBHOOK',
                },
                { name: 'Escalation', endpoint: '#incident-room', type: 'SLACK' },
              ].map(channel => (
                <Tr key={channel.name}>
                  <Td className="text-ellipsis whitespace-nowrap">{channel.name}</Td>
                  <Td className="text-neutral-10 max-w-xs truncate text-xs">{channel.endpoint}</Td>
                  <Td>{channel.type}</Td>
                </Tr>
              ))}
            </TBody>
          </V2Table>
        </div>
      </CallSite>

      <CallSite
        source="31 of 44 TableHeads, 39 of 51 TableCells"
        origin="ui"
        note="The className vocabulary in one place. Alignment is written both ways for the same result: text-right 10 times, text-end 6. Widths are pinned per column with w-[150px] and w-[200px]. Responsive hiding is hidden sm:table-cell. All of it is column configuration, expressed one cell at a time."
      >
        <div className="w-[42rem]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">w-[200px]</TableHead>
                <TableHead className="w-[150px] text-center">w-[150px] text-center</TableHead>
                <TableHead className="text-right">text-right</TableHead>
                <TableHead className="text-end">text-end</TableHead>
                <TableHead className="hidden sm:table-cell">hidden sm:table-cell</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">font-medium</TableCell>
                <TableCell className="text-center">centred</TableCell>
                <TableCell className="text-right">1,024</TableCell>
                <TableCell className="text-end">2,048</TableCell>
                <TableCell className="hidden sm:table-cell">narrow me</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// ui/tabs — three variants, and a className on every single TabsList.
// ---------------------------------------------------------------------------

export const TabsPreview = createPreview({
  label: 'Tabs',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/tabs.tsx"
        origin="ui"
        note="The three declared variants, untouched. variant is set on TabsList, TabsTrigger and TabsContent independently rather than inherited from Tabs, so nothing stops a call site mixing them."
      >
        <div className="flex w-[34rem] flex-col gap-6">
          <Tabs defaultValue="a">
            <TabsList>
              <TabsTrigger value="a">default</TabsTrigger>
              <TabsTrigger value="b">second</TabsTrigger>
            </TabsList>
            <TabsContent value="a">A pill-style segmented control on a filled track.</TabsContent>
            <TabsContent value="b">Second panel.</TabsContent>
          </Tabs>
          <Tabs defaultValue="a">
            <TabsList variant="menu">
              <TabsTrigger variant="menu" value="a">
                menu
              </TabsTrigger>
              <TabsTrigger variant="menu" value="b">
                second
              </TabsTrigger>
            </TabsList>
            <TabsContent variant="menu" value="a">
              An underlined nav, used for the proposal sub-pages.
            </TabsContent>
          </Tabs>
          <Tabs defaultValue="a">
            <TabsList variant="content">
              <TabsTrigger variant="content" value="a">
                content
              </TabsTrigger>
              <TabsTrigger variant="content" value="b">
                second
              </TabsTrigger>
            </TabsList>
            <TabsContent variant="content" value="a">
              A quieter inline switcher that sits on a border.
            </TabsContent>
          </Tabs>
        </div>
      </CallSite>

      <CallSite
        source="pages/target-laboratory.tsx:472 and pages/target-laboratory-new.tsx:816"
        origin="ui"
        note="Byte-identical in both files, down to h-auto p-1 on the list and px-2 py-0 on each trigger - the call site shrinking a control the default variant made too big. The accent dot is a hand-placed div, not a component affordance."
      >
        <Tabs defaultValue="graphiql">
          <TabsList className="h-auto p-1">
            <TabsTrigger value="graphiql" className="px-2 py-0">
              GraphiQL
            </TabsTrigger>
            <TabsTrigger value="hive-laboratory" className="px-2 py-0">
              Hive Laboratory
              <div className="bg-accent ml-1 size-2 rounded-full" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CallSite>

      <CallSite
        source="8 distinct TabsList classNames across 16 call sites"
        origin="ui"
        note="Every TabsList in the app carries a className, and most of them rebuild the container from scratch: rounded-none, bg-transparent, border-x border-b, w-full justify-start. When 16 of 16 call sites override the container, the container is the wrong default."
      >
        <div className="flex w-[34rem] flex-col gap-6">
          <Tabs defaultValue="a">
            <TabsList className="bg-neutral-5 dark:bg-neutral-3 border-neutral-5 dark:border-neutral-3 w-full justify-start rounded-none border-x border-b">
              <TabsTrigger
                value="a"
                className="data-[state=active]:bg-neutral-5 dark:data-[state=active]:bg-neutral-3 border-neutral-5 dark:border-neutral-3 mt-1 rounded-b-none border py-2"
              >
                Attached to a panel
              </TabsTrigger>
              <TabsTrigger value="b" className="mt-1 py-2 data-[state=active]:rounded-b-none">
                Second
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="a">
            <TabsList className="w-full justify-start rounded-b-none bg-transparent px-2 py-0">
              <TabsTrigger value="a" className="text-neutral-9 hover:text-neutral-11">
                Transparent track
              </TabsTrigger>
              <TabsTrigger value="b">Second</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// The two accordions.
// ---------------------------------------------------------------------------

export const Accordions = createPreview({
  label: 'Accordions',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/organization/members/permission-selector.tsx and 5 more"
        origin="ui"
        note="Named parts, string values, a chevron that rotates on [&[data-state=open]>svg]. The trigger underlines on hover and pushes the chevron to the far right with justify-between."
      >
        <div className="w-[34rem]">
          <Accordion type="single" collapsible defaultValue="organization">
            {[
              { value: 'organization', label: 'Organization', count: 12 },
              { value: 'project', label: 'Project', count: 8 },
              { value: 'target', label: 'Target', count: 15 },
            ].map(group => (
              <AccordionItem key={group.value} value={group.value}>
                <AccordionTrigger>
                  {group.label}
                  <span className="text-neutral-10 ml-2 text-xs">{group.count} permissions</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-neutral-11 text-sm">
                    Permission rows for {group.label.toLowerCase()} go here.
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </CallSite>

      <CallSite
        source="pages/target.tsx and the v2 barrel"
        origin="v2"
        note="Same Radix primitive, different surface: an Object.assign compound (Accordion.Item, .Header, .Content), a Radix ChevronDownIcon rather than lucide, and a data-cy hook baked into the root. Its wrapper type carries a @ts-expect-error for the array defaultValue."
      >
        <div className="w-[34rem]">
          <V2Accordion type="single" defaultValue="one">
            <V2Accordion.Item value="one">
              <V2Accordion.Header>products</V2Accordion.Header>
              <V2Accordion.Content>
                <p className="text-neutral-11 text-sm">Subgraph detail for products.</p>
              </V2Accordion.Content>
            </V2Accordion.Item>
            <V2Accordion.Item value="two">
              <V2Accordion.Header>reviews</V2Accordion.Header>
              <V2Accordion.Content>
                <p className="text-neutral-11 text-sm">Subgraph detail for reviews.</p>
              </V2Accordion.Content>
            </V2Accordion.Item>
          </V2Accordion>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// The three small primitives, one preview each. None is big enough to need
// sub-cases, but grouping them under a vague heading told a reader nothing.
// ---------------------------------------------------------------------------

const ALL_TARGETS = [
  'production',
  'staging',
  'development',
  'canary',
  'preview',
  'sandbox',
  'qa',
  'demo',
];

const SPAN_ATTRIBUTES = [
  ['graphql.operation.name', 'DashboardGet'],
  ['graphql.operation.type', 'query'],
  ['graphql.document', '{ hero { name } }'],
  ['http.status_code', '200'],
  ['hive.client.name', 'web-app'],
  ['hive.client.version', '3.4.1'],
  ['server.address', 'api.internal'],
  ['url.path', '/graphql'],
];

/** The tab strip and attribute rows from target-trace.tsx, minus each row's copy and expand actions. */
function SpanAttributesPanel(props: { scroller: (children: React.ReactNode) => React.ReactNode }) {
  return (
    <div className="border-neutral-5 flex h-64 w-[24rem] flex-col rounded-md border">
      <div className="border-neutral-5 flex shrink-0 border-b px-2 text-sm">
        <button type="button" className="border-b-2 border-[#2662d8] p-2">
          <div className="flex items-center gap-x-2">
            <div>Attributes</div>
          </div>
        </button>
        <button type="button" className="hover:border-neutral-5 border-b-2 border-transparent p-2">
          <div className="flex items-center gap-x-2">
            <div>Events</div>
            <div>
              <Badge variant="secondary" className="text-2xs rounded-md px-2 py-0.5 font-thin">
                3
              </Badge>
            </div>
          </div>
        </button>
      </div>
      {props.scroller(
        <div className="h-full">
          {SPAN_ATTRIBUTES.map(([key, value]) => (
            <div
              key={key}
              className="border-neutral-5 flex items-center justify-between border-b p-3 text-xs last:border-0"
            >
              <div className="text-neutral-10 flex flex-1 pr-2">{key}</div>
              <div className="text-neutral-12 truncate">{value}</div>
            </div>
          ))}
        </div>,
      )}
    </div>
  );
}

export const ScrollAreaPreview = createPreview({
  label: 'ScrollArea',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-checks-single.tsx:498"
        origin="ui"
        note="The 'All Targets' list in a popover on a check's page, h-44 w-full. Three live sites remain of the eight Phase 0 counted: the other five were inside the Popover comboboxes that became Selects in round 3. ScrollBar is exported and never used."
      >
        <div className="border-neutral-5 w-[20rem] rounded-md border">
          <div className="p-2">
            <h4 className="text-neutral-12 mb-2 text-sm font-semibold">All Targets</h4>
            <ScrollArea className="h-44 w-full">
              <div className="divide-neutral-5 grid grid-cols-1 divide-y">
                {ALL_TARGETS.map((target, index) => (
                  <div key={index} className="py-2">
                    <div className="text-neutral-10 line-clamp-3 text-sm">{target}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CallSite>

      <CallSite
        source="base/scroll-area (proposed for target-checks-single.tsx:498)"
        origin="base"
        note="height=sm, 160px where the old one was 176. The scrollbar is overlaid and appears on hover or while scrolling."
      >
        <div className="border-neutral-5 w-[20rem] rounded-md border">
          <div className="p-2">
            <h4 className="text-neutral-12 mb-2 text-sm font-semibold">All Targets</h4>
            <BaseScrollArea height="sm">
              <div className="divide-neutral-5 grid grid-cols-1 divide-y">
                {ALL_TARGETS.map((target, index) => (
                  <div key={index} className="py-2">
                    <div className="text-neutral-10 line-clamp-3 text-sm">{target}</div>
                  </div>
                ))}
              </div>
            </BaseScrollArea>
          </div>
        </div>
      </CallSite>

      <CallSite
        source="pages/target-trace.tsx:882 (and :107, the trace tree, same shape)"
        origin="ui"
        note="The span attributes panel: a tab strip, then a ScrollArea with relative grow filling the rest of the column. The rows here drop each attribute's copy and expand buttons."
      >
        <SpanAttributesPanel
          scroller={children => <ScrollArea className="relative grow">{children}</ScrollArea>}
        />
      </CallSite>

      <CallSite
        source="base/scroll-area (proposed for target-trace.tsx:107 and :882)"
        origin="base"
        note="fill takes the rest of the flex column."
      >
        <SpanAttributesPanel
          scroller={children => <BaseScrollArea fill>{children}</BaseScrollArea>}
        />
      </CallSite>
    </div>
  ),
});

const SORT_OPTIONS = [
  {
    value: 'requests',
    label: 'Requests',
    description: 'GraphQL requests made in the last 7 days.',
  },
  {
    value: 'versions',
    label: 'Schema Versions',
    description: 'Schemas published in last 7 days.',
  },
  { value: 'name', label: 'Name', description: 'Sort by project name.' },
];

/** The projects-list toolbar from pages/organization.tsx; the targets one in project.tsx is identical. */
function ListToolbar(props: { gap: 'gap-x-2' | 'gap-x-4'; separator: React.ReactNode }) {
  const [sortBy, setSortBy] = useState('requests');
  return (
    <div className={cn('flex flex-row items-center', props.gap)}>
      <div className="relative">
        <SearchIcon className="text-neutral-10 absolute left-2.5 top-2.5 size-4" />
        <Input
          type="search"
          placeholder="Search..."
          className="dark:bg-neutral-3 bg-neutral-2 h-9 w-full rounded-lg pl-8 md:w-[200px] lg:w-[336px]"
        />
      </div>
      {props.separator}
      <Select options={SORT_OPTIONS} value={sortBy} onValueChange={setSortBy} />
      <Button className="size-9 shrink-0" variant="outline" size="icon">
        <MoveDownIcon className="size-4" />
      </Button>
    </div>
  );
}

export const SeparatorPreview = createPreview({
  label: 'Separator',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/organization.tsx:223 and pages/project.tsx:236"
        origin="ui"
        note="The same toolbar on both pages: search, a divider, the sort Select, the direction button. The divider carries mx-4 h-8 on top of the row's gap-x-2, so it sits 24px from each neighbour. The third importer is ui/sidebar.tsx's SidebarSeparator, which goes with the sidebar."
      >
        <ListToolbar
          gap="gap-x-2"
          separator={<Separator orientation="vertical" className="mx-4 h-8" />}
        />
      </CallSite>

      <CallSite
        source="base/separator (proposed), row unchanged at gap-x-2"
        origin="base"
        note="The divider has no margin of its own, so with the row left as is it sits 8px from each neighbour instead of 24."
      >
        <ListToolbar gap="gap-x-2" separator={<BaseSeparator orientation="vertical" />} />
      </CallSite>

      <CallSite
        source="base/separator (proposed), row moved to gap-x-4"
        origin="base"
        note="The alternative: widen the row's gap, which also spaces the Select from the direction button."
      >
        <ListToolbar gap="gap-x-4" separator={<BaseSeparator orientation="vertical" />} />
      </CallSite>
    </div>
  ),
});

const PREFLIGHT_LOGS = [
  'log: preflight script executed in 12ms',
  'info: 1',
  'warn: true',
  'error: Fatal',
  'log: setting header x-tenant',
  'info: done',
  'log: preflight script executed in 9ms',
  'info: done',
];

/** PreflightLogs from pages/target-laboratory.tsx:721, with plain lines standing in for LogLine. */
function OldPreflightLogs() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('flex max-h-[200px] w-full flex-col overflow-hidden bg-[#030711]')}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between px-4 py-3',
          isOpen ? 'border-b' : 'border-b-0',
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex h-auto items-center gap-2 p-0 hover:bg-transparent"
            data-cy="trigger"
          >
            <ChevronDownIcon
              className={`text-neutral-10 size-4 transition-transform ${
                isOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <h2 className="text-[15px] font-normal">Preflight Script Logs</h2>
          </Button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            data-cy="erase-logs"
            className={cn(
              'text-neutral-10 hover:text-neutral-12 size-8',
              isOpen ? 'visible' : 'invisible',
            )}
          >
            <EraserIcon className="size-4" />
            <span className="sr-only">Clear logs</span>
          </Button>
        </div>
      </div>
      <CollapsibleContent
        className="grow overflow-auto p-4 font-mono text-xs/[18px]"
        data-cy="logs"
      >
        {PREFLIGHT_LOGS.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function NewPreflightLogs() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="flex max-h-[200px] w-full flex-col overflow-hidden bg-[#030711]">
      <BaseCollapsible
        variant="panel"
        trigger="Preflight Script Logs"
        open={isOpen}
        onOpenChange={setIsOpen}
        actions={
          isOpen ? (
            <BaseButton
              layout="iconOnly"
              icon={EraserIcon}
              aria-label="Clear logs"
              variant="ghost"
            />
          ) : null
        }
        panelDataCy="logs"
      >
        <BaseScrollArea fill>
          <div className="p-4 font-mono text-xs/[18px]">
            {PREFLIGHT_LOGS.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </BaseScrollArea>
      </BaseCollapsible>
    </div>
  );
}

const STATUS_OPTIONS = [
  { label: 'ok', value: 'ok', count: 1204 },
  { label: 'error', value: 'error', count: 37 },
];

/**
 * Filter + FilterTitle + FilterContent + FilterOption from target-traces-filter.tsx:68-310, the
 * "Status" group, rendered with the real sidebar parts. The coloured status dot that
 * LabelWithColor adds in target-traces.tsx is left out.
 */
function OldTracesFilterGroup() {
  const [selected, setSelected] = useState<string[]>(['ok']);
  return (
    <div className="text-neutral-11 flex w-64 flex-col">
      <SidebarGroup className="py-0">
        <Collapsible className="group/collapsible" defaultOpen>
          <SidebarGroupLabel
            asChild
            className="group/label text-neutral-11 hover:bg-neutral-5 hover:text-neutral-11 w-full text-sm"
          >
            <CollapsibleTrigger>
              <ChevronRightIcon className="mr-2 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              Status
              {selected.length ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="hover:bg-neutral-2 text-neutral-10 group ml-auto h-6 w-8 px-1 py-0 text-xs"
                  onClick={e => {
                    e.preventDefault();
                    setSelected([]);
                  }}
                  asChild
                >
                  <div>
                    <CircleXIcon className="hidden size-3 group-hover:block" />
                    <span className="block group-hover:hidden">{selected.length}</span>
                  </div>
                </Button>
              ) : null}
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {STATUS_OPTIONS.map(option => (
                  <SidebarMenuButton
                    key={option.value}
                    onClick={() =>
                      setSelected(prev =>
                        prev.includes(option.value)
                          ? prev.filter(value => value !== option.value)
                          : prev.concat(option.value),
                      )
                    }
                    className="hover:bg-neutral-5/50 flex-row items-center justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Checkbox visual checked={selected.includes(option.value)} size="sm" />
                      {option.label}
                    </div>
                    <Badge variant="secondary" className="rounded-sm px-1 font-mono font-normal">
                      {formatNumber(option.count)}
                    </Badge>
                  </SidebarMenuButton>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
    </div>
  );
}

function NewTracesFilterGroup() {
  const [selected, setSelected] = useState<string[]>(['ok']);
  return (
    <div className="text-neutral-11 flex w-64 flex-col">
      <div className="px-2">
        <BaseCollapsible
          trigger="Status"
          defaultOpen
          actions={
            selected.length ? (
              <button
                type="button"
                className="hover:bg-neutral-2 text-neutral-10 group flex h-6 w-8 items-center justify-center rounded-md px-1 text-xs"
                onClick={() => setSelected([])}
              >
                <CircleXIcon className="hidden size-3 group-hover:block" />
                <span className="block group-hover:hidden">{selected.length}</span>
              </button>
            ) : null
          }
        >
          <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
            {STATUS_OPTIONS.map(option => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(prev =>
                      prev.includes(option.value)
                        ? prev.filter(value => value !== option.value)
                        : prev.concat(option.value),
                    )
                  }
                  className="hover:bg-neutral-5/50 flex h-8 w-full items-center justify-between gap-2 overflow-hidden rounded-md p-2 text-left"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Checkbox visual checked={selected.includes(option.value)} size="sm" />
                    {option.label}
                  </div>
                  <Badge variant="secondary" className="rounded-sm px-1 font-mono font-normal">
                    {formatNumber(option.count)}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </BaseCollapsible>
      </div>
      <BaseSeparator />
    </div>
  );
}

export const CollapsiblePreview = createPreview({
  label: 'Collapsible',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-laboratory.tsx:730"
        origin="ui"
        note="The preflight logs panel in the GraphiQL footer. ui/collapsible is three re-exports of Radix with no styling, so the site builds the header itself: a ghost Button as trigger, the erase button beside it (invisible while closed), a border under the header while open, and the content pane scrolling on its own. The page also restyles it through a #preflight-logs style block keyed on Radix's data-state attribute."
      >
        <div className="w-[36rem]">
          <OldPreflightLogs />
        </div>
      </CallSite>

      <CallSite
        source="base/collapsible variant=panel (proposed for target-laboratory.tsx:730)"
        origin="base"
        note="The header is the component's; the erase button is its actions slot, the logs a fill ScrollArea inside the panel. The wrapper keeps the page's background and 200px cap. Title goes from 15px regular to the control size, medium."
      >
        <div className="w-[36rem]">
          <NewPreflightLogs />
        </div>
      </CallSite>

      <CallSite
        source="pages/traces/target-traces-filter.tsx:304"
        origin="ui"
        note="One filter group from the traces column, built from sidebar parts: the group label is the trigger, with the reset count nested inside it as a div-rendered Button that preventDefaults so it does not toggle the group."
      >
        <OldTracesFilterGroup />
      </CallSite>

      <CallSite
        source="base/collapsible variant=section (proposed for target-traces-filter.tsx:304)"
        origin="base"
        note="The reset count moves to the actions slot beside the trigger, so it is a real button outside another button. The hover fill is on the trigger only, not the whole row."
      >
        <NewTracesFilterGroup />
      </CallSite>
    </div>
  ),
});
