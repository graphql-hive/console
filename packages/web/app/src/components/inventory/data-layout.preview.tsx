import { createPreview, type NavPath } from 'react-foundry';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
    source: 'target.tsx, target-checks-single.tsx, target-trace.tsx ×2 and the 4 proposal filters',
    origin: 'ui',
    what: 'ScrollArea — 8 sites, every one setting its own height by className',
    coveredBy: 'ScrollArea',
  },
  {
    source: 'ui/sidebar.tsx, pages/project.tsx, pages/organization.tsx',
    origin: 'ui',
    what: 'Separator — 3 sites, 2 of them vertical',
    coveredBy: 'Separator',
  },
  {
    source: 'pages/target-laboratory.tsx, pages/traces/target-traces-filter.tsx',
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

export const ScrollAreaPreview = createPreview({
  label: 'ScrollArea',
  render: () => (
    <CallSite
      source="pages/target-checks-single.tsx:470 and 7 more"
      origin="ui"
      note="ScrollArea sets no height of its own, so all 8 call sites pass one: h-44 w-full, h-80 w-full, max-h-screen, max-h-[calc(100vh-300px)]. Four of the eight are inside the Popover comboboxes already transcribed under Inventory > Popover. ScrollBar is exported and never used."
    >
      <div className="border-neutral-5 w-[20rem] rounded-md border p-2">
        <ScrollArea className="h-44 w-full">
          <div className="divide-neutral-5 grid grid-cols-1 divide-y">
            {['production', 'staging', 'development', 'canary', 'preview', 'sandbox'].map(t => (
              <div key={t} className="py-2">
                <div className="text-neutral-10 line-clamp-3 text-sm">{t}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </CallSite>
  ),
});

export const SeparatorPreview = createPreview({
  label: 'Separator',
  render: () => (
    <CallSite
      source="pages/organization.tsx, pages/project.tsx, components/ui/sidebar.tsx"
      origin="ui"
      note="Three call sites only, two of them vertical dividers in a toolbar. A naive grep reports six because SelectSeparator and DropdownMenuSeparator match the same pattern."
    >
      <div className="flex h-8 items-center gap-3 text-sm">
        <span>Sort</span>
        <Separator orientation="vertical" />
        <span>Filter</span>
        <Separator orientation="vertical" />
        <span>Search</span>
      </div>
    </CallSite>
  ),
});

export const CollapsiblePreview = createPreview({
  label: 'Collapsible',
  render: () => (
    <CallSite
      source="pages/target-laboratory.tsx, pages/traces/target-traces-filter.tsx"
      origin="ui"
      note="ui/collapsible is 9 lines: three re-exports of Radix with no styling at all. Both call sites therefore build the entire disclosure themselves. It is the clearest delete-and-use-base-directly candidate in this bucket."
    >
      <div className="w-[24rem]">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="text-neutral-12 flex w-full items-center justify-between py-2 text-sm">
            Filters
            <span className="text-neutral-10 text-xs">toggle</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="text-neutral-11 pt-2 text-sm">
            Entirely unstyled by the component: this padding and type came from the call site.
          </CollapsibleContent>
        </Collapsible>
      </div>
    </CallSite>
  ),
});
