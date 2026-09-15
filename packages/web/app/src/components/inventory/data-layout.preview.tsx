import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  Ellipsis,
  Info,
  Lock,
  MoreHorizontal,
  Settings,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Avatar } from '@/components/base/avatar/avatar';
import { Badge } from '@/components/base/badge/badge';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Menu } from '@/components/base/floating/menu/menu';
import { Popover } from '@/components/base/floating/popover/popover';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { Input } from '@/components/base/input/input';
import { StatusDot } from '@/components/base/status-dot/status-dot';
import { Scale } from '@/components/common';
import { TokenExpiration } from '@/components/organization/settings/access-tokens/token-expiration';
import { Priority, Status } from '@/components/organization/support';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { DateWithTimeAgo } from '@/components/ui/date-with-time-ago';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeAgo } from '@/components/ui/time-ago';
import { Accordion as V2Accordion } from '@/components/v2/accordion';
import { Sortable } from '@/components/v2/sortable';
import { TBody, Td, TFoot, Th, THead, Tr, Table as V2Table } from '@/components/v2/table';
import { SupportTicketPriority, SupportTicketStatus } from '@/gql/graphql';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/DataLayout';

/**
 * Tables, tabs and accordions. ScrollArea, Separator and Collapsible were here too until round 4
 * moved them onto base; their transcriptions now live beside each base component as
 * `Component Examples`.
 *
 * Three table implementations and two accordion implementations ship at once, and they are not
 * variants of each other: `v2/THead` wraps its children in a `<tr>` for you while `ui/TableHeader`
 * expects an explicit `TableRow`, so the call-site shapes differ structurally, not just visually.
 * `base/data-table` is the TanStack-driven one that round 5 decides the others' fate against.
 *
 * Table counts are per table, audited 2026-09-15: 18 ui tables in 13 files, 11 v2 tables in 11
 * files, 4 base DataTables, and 8 raw `<table>` elements in 7 files that use no component. The
 * table previews are one representative per shape; the entries list every table each stands for,
 * with a "reads as" call to check in foundry.
 */

const ENTRIES = [
  // Tables, one entry per table rather than per file. "Reads as" is the shape call to check in
  // foundry: a table proper has columns worth a header; a list is rows of one thing; a
  // description is label/value pairs.
  {
    source: 'pages/target-apps.tsx:316',
    origin: 'ui',
    what: 'Bordered, table-fixed, sortable headers via v2 Sortable, responsive hiding, Load more below. Reads as a table.',
    coveredBy: 'Bordered record lists',
  },
  {
    source:
      'access-tokens-table.tsx:72, personal-access-tokens-table.tsx:78, project-access-tokens-table.tsx:79',
    origin: 'ui',
    what: 'Title, masked key, scope badge, dates, actions menu; the Load more button lives in TableCaption. Reads as a table.',
    coveredBy: 'Bordered record lists',
  },
  {
    source: 'pages/organization-support.tsx:341',
    origin: 'ui',
    what: 'Ticket rows muted when solved, pinned column widths, centred status and priority. Reads as a table.',
    coveredBy: 'Bordered record lists',
  },
  {
    source: 'pages/target-checks-affected-deployments.tsx:288, pages/target-app-version.tsx:364',
    origin: 'ui',
    what: 'Bordered lists with a link cell, dates, and (app version) mono chips plus an actions menu. Read as tables.',
    coveredBy: 'Bordered record lists',
  },
  {
    source: 'target/settings/schema-contracts.tsx:183',
    origin: 'ui',
    what: 'Contract rows with a status word plus info popover, tag chips, and actions. Reads as a table.',
    coveredBy: 'Bordered record lists',
  },
  {
    source: 'oidc-integration-configuration.tsx:484',
    origin: 'ui',
    what: 'Registered domains: mono name, verified/pending, manage button; TableCaption doubles as the empty state. Reads as a list.',
    coveredBy: 'Bordered record lists',
  },
  {
    source: 'target/history/errors-and-changes.tsx:351, :410, :441, :569',
    origin: 'ui',
    what: 'Small stats tables inside a change panel: name plus two right-aligned numbers, two of them side by side. Read as tables.',
    coveredBy: 'Stats panels',
  },
  {
    source: 'oidc-integration-configuration.tsx:228, oidc-registered-domain-sheet.tsx:320',
    origin: 'ui',
    what: 'Endpoint/URL and Property/Value pairs with a copy button. Read as descriptions, not tables.',
    coveredBy: 'Key/value tables',
  },
  {
    source: 'pages/native-composition-diff.tsx:251',
    origin: 'ui',
    what: 'Headerless label/number pairs. Reads as a description.',
    coveredBy: 'Key/value tables',
  },
  {
    source: 'pages/target-traces.tsx:572',
    origin: 'ui',
    what: 'TanStack-driven: sort buttons in the header, mono cells, selected-row highlight, spinner and empty rows. Reads as a table; base DataTable territory.',
    coveredBy: 'TanStack tables',
  },
  {
    source: 'target/insights/list.tsx:241, admin/AdminStats.tsx:271',
    origin: 'v2',
    what: 'TanStack-driven on v2 parts: Sortable headers, an info popover, a pager row below. Read as tables; base DataTable territory.',
    coveredBy: 'TanStack tables',
  },
  {
    source: 'alerts/channels-table.tsx:50, alerts/alerts-table.tsx:29',
    origin: 'v2',
    what: 'Headerless: a checkbox and three cells per row, selected rows drive a delete button above. Read as lists.',
    coveredBy: 'Checkbox lists',
  },
  {
    source: 'pages/target-settings.tsx:168, target/settings/cdn-access-tokens.tsx:384',
    origin: 'v2',
    what: 'Headerless token rows: checkbox or delete button, mono key, name, right-aligned times. Read as lists.',
    coveredBy: 'Checkbox lists',
  },
  {
    source: 'billing/PlanSummary.tsx:31, billing/InvoicesList.tsx:38, organization/Usage.tsx:51',
    origin: 'v2',
    what: 'Headered: money and counts right-aligned, PlanSummary the only TFoot, Usage ends in a Scale bar. Read as tables.',
    coveredBy: 'Headered lists',
  },
  {
    source: 'pages/target-proposals-new.tsx:209, proposals/save-proposal-modal.tsx:176',
    origin: 'v2',
    what: 'In a Modal: a confirm checkbox column with a colSpan header, and status rows with an icon. Read as lists.',
    coveredBy: 'Headered lists',
  },
  {
    source: 'members/list.tsx:689',
    origin: 'raw',
    what: 'Hand-built: bordered wrapper, a bg-neutral-3 header row with one label in it, avatar/name/email rows, role or groups on the right, an actions menu; empty states are colSpan rows; pagination below. Reads as a list.',
    coveredBy: 'Raw tables',
  },
  {
    source: 'members/roles.tsx:937, members/invitations.tsx:505',
    origin: 'raw',
    what: 'Hand-built with divide-y rows: Name/Description/Members and Email/Role/Expiration, an actions menu on the right. Read as tables.',
    coveredBy: 'Raw tables',
  },
  {
    source: 'target/explorer/common.tsx:90, :152',
    origin: 'raw',
    what: "Inside the explorer's usage popover: a stats stack that misuses thead, and a Top 5 operations mini table. Read as a stats panel.",
    coveredBy: 'Raw tables',
  },
  {
    source:
      'members/selected-permission-overview.tsx:166, access-tokens/permission-detail-view.tsx:58',
    origin: 'raw',
    what: 'Per permission group: a title row, then permission/badge pairs, with rows straight inside the table and no tbody. Read as descriptions.',
    coveredBy: 'Raw tables',
  },
  {
    source: 'target/proposals/schema-diff/components.tsx:41',
    origin: 'raw',
    what: 'The schema diff viewer: mono rows with line numbers inside a horizontal ScrollArea. A code diff, not a data table; out of scope.',
  },
  {
    source: 'pages/target-traces.tsx:1373 (GridTable)',
    origin: 'raw',
    what: 'A CSS grid of key/value pairs in the timestamp tooltip, named a table but not one. A description list.',
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
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui + v2 table, tabs, accordion"
      summary={
        <>
          <strong>Three tables and two accordions, shipping together.</strong> ui/table has 18
          tables in 13 files, v2/table 11 in 11 files, base/data-table (TanStack, with pagination
          and expandable rows) 4, and eight more are raw <code>&lt;table&gt;</code> elements in
          seven files, three of them the members area&apos;s own record lists. ui and v2 differ
          structurally: <code>v2/THead</code> renders its own <code>&lt;tr&gt;</code> around its
          children, <code>ui/TableHeader</code> requires an explicit <code>TableRow</code>.{' '}
          <code>v2/Tr</code> bakes in zebra striping (<code>odd:bg-neutral-8/10</code>) that ui has
          no equivalent for, and <code>v2/Th</code> and <code>Td</code> take an <code>align</code>{' '}
          prop where ui aligns by className.
          <br />
          <br />
          <strong>Dead export:</strong> <code>TableFooter</code>, zero call sites.{' '}
          <code>TableCaption</code> has four, none a caption: three hold a Load more button and one
          is an empty-state message. <code>v2/TFoot</code> has one, the plan total.
          <br />
          <br />
          <strong>Not every table is a table.</strong> Four v2 tables have no header at all and are
          rows of one thing with a checkbox or a delete button; three ui tables are label/value
          pairs. The entries below say what each reads as, to check in foundry before deciding how
          much table the base component needs.
          <br />
          <br />
          <strong>297 cells, 24 kinds of content.</strong> The &quot;Cell types&quot; preview
          renders one sample of each with its sources: the inventory for a base DataTableCell.
          <br />
          <br />
          <strong>className is the actual API here.</strong> 39 of 51 <code>TableCell</code>s carry
          one, 31 of 44 <code>TableHead</code>s, 31 of 36 <code>TabsTrigger</code>s, and{' '}
          <strong>16 of 16 TabsLists</strong> — not one Tabs call site accepts the component&apos;s
          own container styling. Cell alignment is written two ways for the same result:{' '}
          <code>text-right</code> 19 times and <code>text-end</code> 8.
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
// Tables, by shape. One representative per shape, transcribed from its call site; the entries
// above list every table each one stands for. Links are plain anchors: the router is not here.
// ---------------------------------------------------------------------------

const DEPLOYMENTS = [
  {
    name: 'checkout-web',
    version: '1.4.2',
    status: 'active',
    docs: 128,
    createdAt: '2026-08-30T09:12:00.000Z',
    activatedAt: '2026-08-30T09:40:00.000Z',
    lastUsed: '2 hours ago',
  },
  {
    name: 'admin-portal',
    version: '0.9.0',
    status: 'pending',
    docs: 42,
    createdAt: '2026-09-11T15:03:00.000Z',
    activatedAt: null,
    lastUsed: null,
  },
];

function AppDeploymentsTable() {
  const [sortBy, setSortBy] = useState<'CREATED_AT' | 'ACTIVATED_AT' | 'LAST_USED'>('CREATED_AT');
  const sortOrder = (key: typeof sortBy) => (sortBy === key ? 'desc' : false);
  return (
    <div>
      <div className="rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[30%] sm:table-cell">App@Version</TableHead>
              <TableHead className="hidden w-[15%] text-center sm:table-cell">Status</TableHead>
              <TableHead className="hidden w-[5%] text-center sm:table-cell">Documents</TableHead>
              <TableHead className="hidden w-[10%] text-center sm:table-cell">
                <Sortable
                  sortOrder={sortOrder('CREATED_AT')}
                  onClick={() => setSortBy('CREATED_AT')}
                >
                  Created
                </Sortable>
              </TableHead>
              <TableHead className="hidden w-[10%] text-center sm:table-cell">
                <Sortable
                  sortOrder={sortOrder('ACTIVATED_AT')}
                  onClick={() => setSortBy('ACTIVATED_AT')}
                >
                  Activated
                </Sortable>
              </TableHead>
              <TableHead className="hidden w-[7%] text-end sm:table-cell">
                <Sortable sortOrder={sortOrder('LAST_USED')} onClick={() => setSortBy('LAST_USED')}>
                  <Tooltip
                    trigger="Last used"
                    content="Last time a request was sent for this app. Requires usage reporting being set up."
                  />
                </Sortable>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEPLOYMENTS.map(app => (
              <TableRow key={app.name}>
                <TableCell>
                  <a href="#" className="font-mono text-xs font-bold">
                    {app.name}@{app.version}
                  </a>
                </TableCell>
                <TableCell className="hidden text-center sm:table-cell">
                  <Badge content={app.status} variants={{ variant: 'secondary' }} />
                </TableCell>
                <TableCell className="text-center">{app.docs}</TableCell>
                <TableCell className="hidden text-center sm:table-cell">
                  <span className="text-xs">
                    <DateWithTimeAgo date={app.createdAt} />
                  </span>
                </TableCell>
                <TableCell className="hidden text-center sm:table-cell">
                  {app.activatedAt ? (
                    <span className="text-xs">
                      <DateWithTimeAgo date={app.activatedAt} />
                    </span>
                  ) : (
                    <span className="text-neutral-10 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-end">
                  {app.lastUsed ? (
                    <Badge content={app.lastUsed} variants={{ variant: 'outline' }} />
                  ) : (
                    <span className="text-neutral-10 text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs">Showing 2 of 14 deployments</span>
        <Button size="sm" variant="outline" className="flex">
          Load more
        </Button>
      </div>
    </div>
  );
}

const TICKETS = [
  {
    id: '4821',
    subject: 'Schema check stuck in pending',
    status: SupportTicketStatus.Open,
    priority: SupportTicketPriority.High,
    updatedAt: '2026-09-13T08:30:00.000Z',
  },
  {
    id: '4790',
    subject: 'CDN token rotation question',
    status: SupportTicketStatus.Solved,
    priority: SupportTicketPriority.Normal,
    updatedAt: '2026-09-02T16:10:00.000Z',
  },
];

export const BorderedRecordLists = createPreview({
  label: 'Bordered record lists',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-apps.tsx:316"
        origin="ui"
        note="table-fixed with percentage widths on every header, responsive hiding on all but two columns, and v2's Sortable inside three of them. Load more sits below the border, with the count. Resize the canvas below sm to see the columns drop."
      >
        <div className="w-[52rem]">
          <AppDeploymentsTable />
        </div>
      </CallSite>
      <CallSite
        source="access-tokens-table.tsx:72 and the personal and project token tables"
        origin="ui"
        note="The Load more button lives in TableCaption, which caption-bottom puts under the rows. Scope is a badge, the key is masked, and the last column is an actions menu on an ellipsis with no accessible name."
      >
        <div className="w-[52rem]">
          <Table>
            <TableCaption>
              <Button size="sm" variant="outline" className="ml-auto mr-0 flex">
                Load more
              </Button>
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-[100px]">Private Key</TableHead>
                <TableHead className="pl-10">Scope</TableHead>
                <TableHead className="text-center">Created At</TableHead>
                <TableHead className="text-center">Expiration</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                {
                  title: 'CI publish',
                  key: 'hv1',
                  createdAt: '2026-08-20T10:00:00.000Z',
                  expiresAt: null,
                },
                {
                  title: 'Laptop',
                  key: 'hv2',
                  createdAt: '2026-09-10T10:00:00.000Z',
                  expiresAt: '2026-10-10T10:00:00.000Z',
                },
              ].map(token => (
                <TableRow key={token.title}>
                  <TableCell className="font-medium">{token.title}</TableCell>
                  <TableCell className="font-mono">{token.key}••••••••••••••••••••</TableCell>
                  <TableCell className="pl-10 font-mono">
                    <Badge content="organization" variants={{ variant: 'success' }} />
                  </TableCell>
                  <TableCell className="text-center">
                    created <TimeAgo date={token.createdAt} />
                  </TableCell>
                  <TableCell className="text-center">
                    <TokenExpiration expiresAt={token.expiresAt} />
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <Menu
                      trigger={
                        <button type="button" className="ml-auto block">
                          <Ellipsis className="size-4" />
                        </button>
                      }
                      sections={[
                        {
                          label: 'Options',
                          items: [
                            { label: 'View Details', onClick: () => {} },
                            { label: 'Delete', onClick: () => {} },
                          ],
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CallSite>
      <CallSite
        source="pages/organization-support.tsx:341"
        origin="ui"
        note="No border wrapper. Column widths are pinned on the header and repeated on every cell; a solved ticket mutes the whole row to neutral-10, link included."
      >
        <div className="w-[52rem]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-center">ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[150px] text-center">Status</TableHead>
                <TableHead className="w-[150px] text-center">Priority</TableHead>
                <TableHead className="w-[150px] text-right">Last updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TICKETS.map(ticket => {
                const isSolved = ticket.status === SupportTicketStatus.Solved;
                return (
                  <TableRow key={ticket.id} className={isSolved ? 'text-neutral-10' : ''}>
                    <TableCell className="text-center">{ticket.id}</TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className={
                          isSolved ? 'text-neutral-10 h-auto p-0 text-left' : 'h-auto p-0 text-left'
                        }
                        asChild
                      >
                        <a href="#">{ticket.subject}</a>
                      </Button>
                    </TableCell>
                    <TableCell className="w-[150px] text-center">
                      <Status status={ticket.status} />
                    </TableCell>
                    <TableCell className="w-[150px] text-center">
                      <Priority level={ticket.priority} />
                    </TableCell>
                    <TableCell className="w-[200px] text-right text-xs">
                      <TimeAgo date={ticket.updatedAt} className="text-neutral-10" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CallSite>
    </div>
  ),
});

export const StatsPanels = createPreview({
  label: 'Stats panels',
  render: () => (
    <CallSite
      source="target/history/errors-and-changes.tsx:351 and :410, side by side"
      origin="ui"
      note="Two three-column tables in a flex row inside a change's usage panel: a pinned 150px name column and two right-aligned numbers. The operation name is a popover trigger in the site's orange link colour."
    >
      <div className="flex w-[52rem] space-x-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Operation Name</TableHead>
              <TableHead className="text-right">Total Requests</TableHead>
              <TableHead className="text-right">% of traffic</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { hash: 'a91f', name: 'GetCart', count: '12,408', pct: '38.2%' },
              { hash: '0c3e', name: 'Checkout', count: '4,102', pct: '12.6%' },
            ].map(op => (
              <TableRow key={op.hash}>
                <TableCell className="font-medium">
                  <Popover
                    trigger={
                      <button
                        type="button"
                        className="text-orange-800 hover:text-orange-800 hover:underline-offset-4 dark:text-orange-500 dark:hover:text-orange-500"
                      >
                        {op.hash}_{op.name}
                      </button>
                    }
                    side="right"
                    arrow
                    content={
                      <div className="flex flex-col gap-y-2 text-sm">
                        View live usage on
                        <p>
                          <a href="#" className="text-accent_80 hover:text-accent">
                            production
                          </a>{' '}
                          <span className="text-neutral-12">target</span>
                        </p>
                      </div>
                    }
                  />
                </TableCell>
                <TableCell className="text-right">{op.count}</TableCell>
                <TableCell className="text-right">{op.pct}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Client Name</TableHead>
              <TableHead className="text-right">Total Requests</TableHead>
              <TableHead className="text-right">% of traffic</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { name: 'web', count: '9,880', pct: '30.4%' },
              { name: 'ios', count: '6,630', pct: '20.4%' },
            ].map(client => (
              <TableRow key={client.name}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="text-right">{client.count}</TableCell>
                <TableCell className="text-right">{client.pct}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CallSite>
  ),
});

export const KeyValueTables = createPreview({
  label: 'Key/value tables',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="oidc-integration-configuration.tsx:228"
        origin="ui"
        note="A two-column table whose first column is a label: three endpoints, each with a copy button. The header row names the two columns Endpoint and URL."
      >
        <div className="w-[42rem]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Sign-in redirect URI', 'https://app.graphql-hive.com/auth/callback/oidc'],
                ['Sign-out redirect URI', 'https://app.graphql-hive.com/logout'],
                ['Sign-in URL', 'https://app.graphql-hive.com/auth/oidc?id=9c1f'],
              ].map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell>
                    <span>{value}</span> <CopyIconButton label="Copy" value={value} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CallSite>
      <CallSite
        source="oidc-registered-domain-sheet.tsx:320"
        origin="ui"
        note="Property/Value for a DNS record, mono values with a copy button. The whole table drops to opacity-33 and loses pointer events until a challenge exists."
      >
        <div className="w-[42rem]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Type', 'TXT'],
                ['Name', '_hive-challenge.example.com'],
                ['Value', 'hive-domain-verification=3af771c7'],
              ].map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="font-mono font-medium">
                    {value} <CopyIconButton label="Copy" value={value} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CallSite>
      <CallSite
        source="pages/native-composition-diff.tsx:251"
        origin="ui"
        note="No header at all: a bold label and a right-aligned number per row. A description list wearing a table."
      >
        <div className="w-[24rem]">
          <Table className="text-sm">
            <TableBody>
              {[
                ['Services', '7'],
                ['Composition Errors', '0'],
                ['Composition Duration', '412ms'],
              ].map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell className="font-semibold">{label}</TableCell>
                  <TableCell className="text-right">{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CallSite>
    </div>
  ),
});

const TRACES = [
  { id: 'a91f3c2e8d0b4471', time: 'SEP 13 14:02:11', op: 'query GetCart', ms: '38', ok: true },
  {
    id: '0c3e77b1f2a94d10',
    time: 'SEP 13 14:02:09',
    op: 'mutation Checkout',
    ms: '412',
    ok: false,
  },
  { id: 'e4d6b9f0a7c3e1d5', time: 'SEP 13 14:01:58', op: 'query GetCart', ms: '41', ok: true },
];

function TracesTable() {
  const [selected, setSelected] = useState<string | null>(TRACES[1].id);
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={loading}
          onCheckedChange={value => setLoading(value === true)}
          size="sm"
        />
        Show the loading row instead
      </label>
      <div className="bg-neutral-2/50 rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="[&:has([role=checkbox])]:pl-3">
                <div className="pl-2 text-left">Trace ID</div>
              </TableHead>
              <TableHead className="[&:has([role=checkbox])]:pl-3">
                <Button variant="link" className="text-neutral-10">
                  Timestamp
                  <ArrowUpDown className="ml-2 size-4" />
                </Button>
              </TableHead>
              <TableHead className="[&:has([role=checkbox])]:pl-3">Operation</TableHead>
              <TableHead className="[&:has([role=checkbox])]:pl-3">Duration</TableHead>
              <TableHead className="[&:has([role=checkbox])]:pl-3">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex h-24 w-full">
                    <Spinner className="m-auto" />
                  </div>
                </td>
              </tr>
            ) : (
              TRACES.map(trace => (
                <TableRow
                  key={trace.id}
                  className={
                    selected === trace.id ? 'bg-neutral-12/10 cursor-pointer' : 'cursor-pointer'
                  }
                  onClick={() => setSelected(trace.id)}
                >
                  <TableCell className="font-mono [&:has([role=checkbox])]:pl-3">
                    <div className="px-2 text-left font-mono text-xs font-medium">
                      <a
                        href="#"
                        className="text-neutral-12 group block w-[6ch] overflow-hidden whitespace-nowrap"
                      >
                        <span className="decoration-neutral-5 group-hover:decoration-neutral-12 underline decoration-2 underline-offset-2">
                          {trace.id.substring(0, 8)}
                        </span>
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono [&:has([role=checkbox])]:pl-3">
                    <div className="px-4 font-mono text-xs uppercase">{trace.time}</div>
                  </TableCell>
                  <TableCell className="font-mono [&:has([role=checkbox])]:pl-3">
                    {trace.op}
                  </TableCell>
                  <TableCell className="font-mono [&:has([role=checkbox])]:pl-3">
                    {trace.ms} ms
                  </TableCell>
                  <TableCell className="font-mono [&:has([role=checkbox])]:pl-3">
                    <Badge
                      content={trace.ok ? 'Ok' : 'Error'}
                      variants={{ variant: trace.ok ? 'success' : 'critical' }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const OPERATIONS = [
  {
    name: 'GetCart',
    kind: 'query',
    p90: '38ms',
    p95: '61ms',
    p99: '120ms',
    fail: '0.2',
    count: '12,408',
    traffic: 38.2,
  },
  {
    name: 'Checkout',
    kind: 'mutation',
    p90: '412ms',
    p95: '590ms',
    p99: '1.2s',
    fail: '3.1',
    count: '4,102',
    traffic: 12.6,
  },
];

function InsightsOperationsTable() {
  const [sorted, setSorted] = useState<'requests' | 'p99'>('requests');
  return (
    <div>
      <div className="overflow-x-scroll">
        <V2Table>
          <THead>
            <Th className="text-sm font-semibold" align="left">
              <div className="inline-flex items-center gap-x-2">Operations</div>
            </Th>
            <Th className="text-sm font-semibold" align="center">
              <div className="inline-flex items-center gap-x-2">Kind</div>
            </Th>
            <Th className="text-sm font-semibold" align="center">
              <div className="inline-flex items-center gap-x-2">
                <Sortable
                  sortOrder={sorted === 'p99' ? 'desc' : false}
                  onClick={() => setSorted('p99')}
                >
                  p99
                </Sortable>
              </div>
            </Th>
            <Th className="text-sm font-semibold" align="center">
              <div className="inline-flex items-center gap-x-2">
                <Sortable
                  sortOrder={sorted === 'requests' ? 'desc' : false}
                  onClick={() => setSorted('requests')}
                >
                  Requests
                </Sortable>
              </div>
            </Th>
            <Th className="text-sm font-semibold" align="center">
              <div className="inline-flex items-center gap-x-2">
                Impact
                <Popover
                  trigger={
                    <button type="button" aria-label="How impact is calculated">
                      <Info className="text-neutral-10 size-4" />
                    </button>
                  }
                  openOnHover
                  width="md"
                  content={
                    <div className="text-neutral-11 text-left text-xs">
                      <p className="mb-4">
                        Equals to the total time spent on this operation in the selected period in
                        seconds.
                      </p>
                      <code className="text-xs">Impact = Requests * avg/1000</code>
                    </div>
                  }
                />
              </div>
            </Th>
            <Th className="text-sm font-semibold" align="right">
              <div className="inline-flex items-center gap-x-2">Traffic</div>
            </Th>
            <Th className="text-sm font-semibold" align="left" />
          </THead>
          <TBody>
            {OPERATIONS.map(op => (
              <Tr key={op.name}>
                <Td className="font-medium">
                  <a href="#" className="block max-w-[300px] truncate text-orange-500">
                    {op.name}
                  </a>
                </Td>
                <Td align="center" className="text-xs">
                  {op.kind}
                </Td>
                <Td align="center">{op.p99}</Td>
                <Td align="center">{op.count}</Td>
                <Td align="center">{op.fail}</Td>
                <Td align="right">{op.traffic}%</Td>
                <Td>
                  <Scale value={op.traffic} size={10} max={100} className="justify-end" />
                </Td>
              </Tr>
            ))}
          </TBody>
        </V2Table>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="outline" disabled>
          First
        </Button>
        <Button aria-label="Go to previous page" variant="outline" disabled>
          ‹
        </Button>
        <span className="whitespace-nowrap text-sm font-bold">1 / 12</span>
        <Button aria-label="Go to next page" variant="outline">
          ›
        </Button>
        <Button variant="outline">Last</Button>
        <div className="ml-6">Go to:</div>
        <Input id="page" width="xs" type="number" defaultValue={1} />
      </div>
    </div>
  );
}

export const TanStackTables = createPreview({
  label: 'TanStack tables',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-traces.tsx:572"
        origin="ui"
        note="ui parts driven by a TanStack table: a sort button in the header, every cell mono, the selected row tinted neutral-12/10, and a raw <tr> for the spinner while the first page loads. Click a row to select it; base DataTable already covers the row click and empty state."
      >
        <div className="w-[52rem]">
          <TracesTable />
        </div>
      </CallSite>
      <CallSite
        source="target/insights/list.tsx:241 (AdminStats.tsx:271 is the same pattern without the popover)"
        origin="v2"
        note="v2 parts driven by a TanStack table: Th takes align, Sortable wraps the sortable headers, one header carries an info popover, and the pager is hand-built below with the base Input from round 5. The wrapper is overflow-x-scroll, so a horizontal scrollbar shows even when nothing overflows."
      >
        <div className="w-[52rem]">
          <InsightsOperationsTable />
        </div>
      </CallSite>
    </div>
  ),
});

function ChannelsList() {
  const [checked, setChecked] = useState<string[]>(['Ops webhook']);
  const toggle = (name: string, on: boolean) =>
    setChecked(prev => (on ? [...prev, name] : prev.filter(n => n !== name)));
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="destructive" disabled={checked.length === 0}>
          Delete ({checked.length || null})
        </Button>
      </div>
      <V2Table>
        <TBody>
          {[
            { name: 'Team Slack', endpoint: '#alerts', type: 'SLACK' },
            { name: 'Ops webhook', endpoint: 'https://ops.internal/hooks/hive', type: 'WEBHOOK' },
            { name: 'Escalation', endpoint: '#incident-room', type: 'SLACK' },
          ].map(channel => (
            <Tr key={channel.name}>
              <Td width="1">
                <Checkbox
                  checked={checked.includes(channel.name)}
                  onCheckedChange={on => toggle(channel.name, on === true)}
                />
              </Td>
              <Td className="text-ellipsis whitespace-nowrap">{channel.name}</Td>
              <Td className="text-neutral-10 max-w-xs truncate text-xs">{channel.endpoint}</Td>
              <Td className="flex max-w-24 content-end">
                <Badge content={channel.type} variants={{ variant: 'secondary' }} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </V2Table>
    </div>
  );
}

export const CheckboxLists = createPreview({
  label: 'Checkbox lists',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="alerts/channels-table.tsx:50 (alerts-table.tsx:29 is the same with different cells)"
        origin="v2"
        note="No header. A checkbox column at width=1, then name, muted endpoint and a type badge; the checked rows feed the Delete button above. Zebra striping and the text-xs row come from v2/Tr."
      >
        <div className="w-[42rem]">
          <ChannelsList />
        </div>
      </CallSite>
      <CallSite
        source="pages/target-settings.tsx:168 (cdn-access-tokens.tsx:384 swaps the checkbox for a trash button on the right)"
        origin="v2"
        note="Registry tokens: checkbox, mono alias, name, then two right-aligned time cells. Also headerless."
      >
        <div className="w-[42rem]">
          <V2Table>
            <TBody>
              {[
                {
                  alias: 'a91f••••••••••3c2e',
                  name: 'CI publish',
                  used: '2026-09-13T08:00:00.000Z',
                  created: '2026-08-20T10:00:00.000Z',
                },
                {
                  alias: '0c3e••••••••••7b1f',
                  name: 'Laptop',
                  used: null,
                  created: '2026-09-10T10:00:00.000Z',
                },
              ].map(token => (
                <Tr key={token.alias}>
                  <Td width="1">
                    <Checkbox checked={false} onCheckedChange={() => {}} />
                  </Td>
                  <Td className="font-mono">{token.alias}</Td>
                  <Td>{token.name}</Td>
                  <Td align="right">
                    {token.used ? (
                      <>
                        last used <TimeAgo date={token.used} />
                      </>
                    ) : (
                      'not used yet'
                    )}
                  </Td>
                  <Td align="right">
                    created <TimeAgo date={token.created} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </V2Table>
        </div>
      </CallSite>
      <CallSite
        source="target/settings/cdn-access-tokens.tsx:468"
        origin="v2"
        note="The CDN token row: masked key, alias, created, and a ghost trash button that turns red on hover."
      >
        <div className="w-[42rem]">
          <V2Table>
            <TBody>
              <Tr>
                <Td>a91f••••••••••3c2e</Td>
                <Td>Edge cache</Td>
                <Td align="right">
                  created <TimeAgo date="2026-08-20T10:00:00.000Z" />
                </Td>
                <Td align="right">
                  <Button className="hover:text-red-500" variant="ghost" aria-label="Delete token">
                    <Trash2 className="size-4" />
                  </Button>
                </Td>
              </Tr>
            </TBody>
          </V2Table>
        </div>
      </CallSite>
    </div>
  ),
});

function ProposalConfirmations() {
  const [confirmed, setConfirmed] = useState([true, false]);
  const rows = [
    { name: 'products', reason: 'Field Product.price changed type from Float to Money' },
    { name: 'users', reason: 'Type Address was removed' },
  ];
  return (
    <div>
      <V2Table>
        <THead>
          <Th className="px-0 text-center">confirm</Th>
          <Th colSpan={2}>schema</Th>
        </THead>
        <TBody>
          {rows.map((row, idx) => (
            <Tr key={row.name}>
              <Td>
                <div className="flex justify-center">
                  <Checkbox
                    size="sm"
                    checked={confirmed[idx]}
                    onCheckedChange={() => {
                      const next = [...confirmed];
                      next[idx] = !next[idx];
                      setConfirmed(next);
                    }}
                  />
                </div>
              </Td>
              <Td className="truncate">{row.name}</Td>
              <Td className="break-normal">{row.reason}</Td>
            </Tr>
          ))}
        </TBody>
      </V2Table>
      <div className="mt-4 text-right">
        <Button disabled={!confirmed.every(Boolean)}>Confirm Changes</Button>
      </div>
    </div>
  );
}

export const HeaderedLists = createPreview({
  label: 'Headered lists',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="billing/PlanSummary.tsx:31"
        origin="v2"
        note="The only TFoot in the app, holding the monthly total. Every number column is align=right with a 150px minimum; ui/table would write text-right on each cell instead."
      >
        <div className="w-[42rem]">
          <V2Table>
            <THead>
              <Th>Feature</Th>
              <Th align="right" className="min-w-[150px]">
                Units
              </Th>
              <Th align="right" className="min-w-[150px]">
                Unit Price
              </Th>
              <Th align="right" className="min-w-[150px]">
                Total
              </Th>
            </THead>
            <TBody>
              <Tr>
                <Td>
                  Base price <span className="text-neutral-10">(unlimited seats)</span>
                </Td>
                <Td align="right" />
                <Td align="right">$10.00</Td>
                <Td align="right">$10.00</Td>
              </Tr>
              <Tr>
                <Td>
                  Included Operations <span className="text-neutral-10">(free)</span>
                </Td>
                <Td align="right">1M</Td>
                <Td align="right">$0.00</Td>
                <Td align="right">$0.00</Td>
              </Tr>
              <Tr>
                <Td>Operations</Td>
                <Td align="right">12M</Td>
                <Td align="right">$10.00</Td>
                <Td align="right">$120.00</Td>
              </Tr>
            </TBody>
            <TFoot>
              <Th>Total monthly (after trial ends)</Th>
              <Th align="right">$130.00</Th>
            </TFoot>
          </V2Table>
        </div>
      </CallSite>
      <CallSite
        source="billing/InvoicesList.tsx:38 (organization/Usage.tsx:51 is the same with right-aligned numbers and a Scale bar)"
        origin="v2"
        note="The plainest v2 table: six left-aligned headers, a link in the last cell."
      >
        <div className="w-[42rem]">
          <V2Table>
            <THead>
              <Th>Invoice Date</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Period Start</Th>
              <Th>Period End</Th>
              <Th>PDF</Th>
            </THead>
            <TBody>
              {[
                {
                  date: 'Sep 1, 2026',
                  amount: '$130.00',
                  status: 'paid',
                  start: 'Aug 1, 2026',
                  end: 'Aug 31, 2026',
                },
                {
                  date: 'Aug 1, 2026',
                  amount: '$130.00',
                  status: 'paid',
                  start: 'Jul 1, 2026',
                  end: 'Jul 31, 2026',
                },
              ].map(invoice => (
                <Tr key={invoice.date}>
                  <Td>{invoice.date}</Td>
                  <Td>{invoice.amount}</Td>
                  <Td>{invoice.status}</Td>
                  <Td>{invoice.start}</Td>
                  <Td>{invoice.end}</Td>
                  <Td>
                    <Button variant="orangeLink" asChild>
                      <a href="#">Download</a>
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </V2Table>
        </div>
      </CallSite>
      <CallSite
        source="pages/target-proposals-new.tsx:209 (save-proposal-modal.tsx:176 is two columns of title and status icon)"
        origin="v2"
        note="Inside a Modal: a centred confirm checkbox column whose header is px-0, a colSpan=2 header over the two text cells, and the button below enables once every row is ticked."
      >
        <div className="w-[36rem]">
          <ProposalConfirmations />
        </div>
      </CallSite>
    </div>
  ),
});

const MEMBERS = [
  { name: 'Ada Lovelace', email: 'ada@the-guild.dev', role: 'owner' as const },
  { name: 'Grace Hopper', email: 'grace@the-guild.dev', role: 'group' as const },
];

function RowMenu() {
  return (
    <Menu
      align="end"
      width="sm"
      trigger={
        <Button variant="ghost" className="data-[popup-open]:bg-neutral-3 flex size-8 p-0">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      }
      sections={[
        [
          { label: 'Show', onClick: () => {} },
          { label: 'Edit', onClick: () => {} },
          { label: 'Delete', variant: 'destructiveAction', onClick: () => {} },
        ],
      ]}
    />
  );
}

export const RawTables = createPreview({
  label: 'Raw tables',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="members/list.tsx:689"
        origin="raw"
        note="No component at all. A rounded border wrapper, a bg-neutral-3 header row where only one of four cells has a label, divide-y rows with an avatar circle, name and email, the role or group pills right-aligned, and an actions menu. Empty states are colSpan rows; a Page counter and buttons sit below."
      >
        <div className="w-[52rem]">
          <div className="overflow-hidden rounded-lg border">
            <table className="divide-neutral-10/20 w-full table-auto divide-y">
              <thead className="bg-neutral-3 border-b px-4 py-3 text-sm font-medium">
                <tr>
                  <th className="" />
                  <th className="relative min-w-[450px] select-none py-3 pl-3 text-left text-sm">
                    Member
                  </th>
                  <th className="relative w-full select-none py-3 text-center align-middle text-sm font-semibold" />
                  <th className="w-12 py-3 text-right text-sm font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-neutral-10/20 divide-y">
                {MEMBERS.map(member => (
                  <tr key={member.email}>
                    <td className="w-12 pl-2">
                      <div className="bg-neutral-3 flex h-9 w-9 items-center justify-center rounded-full">
                        <UserRound className="mx-auto size-5" />
                      </div>
                    </td>
                    <td className="overflow-hidden py-3 pl-3 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <h3 className="line-clamp-1 font-medium">{member.name}</h3>
                      </div>
                      <h4 className="text-neutral-10 text-xs">{member.email}</h4>
                    </td>
                    <td className="w-full py-3 text-right text-sm" align="right">
                      {member.role === 'owner' ? (
                        <Tooltip
                          trigger={<span className="font-bold">Owner</span>}
                          content="The organization owner has full access to everything within the organization. The role of the owner can not be changed."
                        />
                      ) : (
                        <div className="ml-auto mr-0 w-fit">
                          <Badge content="Engineering" variants={{ variant: 'secondary' }} />
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right text-sm">
                      <RowMenu />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-neutral-10 text-sm">Page 1</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>
      </CallSite>
      <CallSite
        source="members/roles.tsx:937 (invitations.tsx:505 is the same construction, table-fixed, with truncating cells)"
        origin="raw"
        note="divide-y rows and no wrapper. The name cell carries a lock tooltip and a default-role popover; the description is muted; the actions menu is a ghost button with an sr-only label."
      >
        <div className="w-[52rem]">
          <table className="divide-neutral-10/20 w-full table-auto divide-y-[1px]">
            <thead>
              <tr>
                <th className="min-w-[200px] py-3 text-left text-sm font-semibold">Name</th>
                <th className="py-3 text-left text-sm font-semibold">Description</th>
                <th className="min-w-[150px] py-3 text-center text-sm font-semibold">Members</th>
                <th className="w-12 py-3 text-right text-sm font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-neutral-10/20 divide-y-[1px]">
              {[
                {
                  name: 'Admin',
                  description: 'Full access to the organization.',
                  members: 2,
                  locked: true,
                  isDefault: false,
                },
                {
                  name: 'Viewer',
                  description: 'Read-only access to every project.',
                  members: 14,
                  locked: false,
                  isDefault: true,
                },
              ].map(role => (
                <tr key={role.name}>
                  <td className="py-3 text-sm font-medium">
                    <div className="flex flex-row items-center">
                      <div>{role.name}</div>
                      {role.locked ? (
                        <div className="ml-2">
                          <Tooltip
                            trigger={
                              <span className="inline-flex">
                                <Lock className="size-4" />
                              </span>
                            }
                            side="right"
                            content={
                              <div className="flex flex-col items-start gap-y-1 p-2">
                                <div className="text-xs font-medium">This role is locked</div>
                                <div className="text-neutral-10 text-xs">
                                  Locked roles are created by the system and cannot be modified or
                                  deleted.
                                </div>
                              </div>
                            }
                          />
                        </div>
                      ) : null}
                      {role.isDefault ? (
                        <div className="ml-2">
                          <Popover
                            trigger={
                              <button type="button" aria-label="About the default role">
                                <Badge content="default" variants={{ variant: 'outline' }} />
                              </button>
                            }
                            openOnHover
                            side="right"
                            content={
                              <div className="flex flex-col items-start gap-y-2">
                                <div className="font-medium">Default role for new members</div>
                                <div className="text-neutral-10 text-sm">
                                  <p>New members will be assigned to this role by default.</p>
                                </div>
                              </div>
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-neutral-10 break-words py-3 text-sm" title={role.description}>
                    {role.description}
                  </td>
                  <td className="py-3 text-center text-sm">
                    {role.members} {role.members === 1 ? 'member' : 'members'}
                  </td>
                  <td className="py-3 text-right text-sm">
                    <RowMenu />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CallSite>
      <CallSite
        source="target/explorer/common.tsx:152"
        origin="raw"
        note="Inside the explorer's usage popover: a Top 5 operations mini table with p-2 cells, the first column flush left, the numbers centred and bold. The same stats-panel shape as errors-and-changes, without ui/table."
      >
        <table className="mt-4 table-auto">
          <thead>
            <tr>
              <th className="p-2 pl-0 text-left">Top 5 Operations</th>
              <th className="p-2 text-center">Reqs</th>
              <th className="p-2 text-center">Of total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { hash: 'a91f', name: 'GetCart', count: '12,408', pct: '38.20' },
              { hash: '0c3e', name: 'Checkout', count: '4,102', pct: '12.63' },
            ].map(op => (
              <tr key={op.hash}>
                <td className="px-2 pl-0 text-left">
                  <a
                    href="#"
                    className="text-orange-800 hover:text-orange-800 hover:underline hover:underline-offset-2 dark:text-orange-500 dark:hover:text-orange-500"
                  >
                    {op.hash}_{op.name}
                  </a>
                </td>
                <td className="px-2 text-center font-bold">{op.count}</td>
                <td className="px-2 text-center font-bold">{op.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CallSite>
      <CallSite
        source="members/selected-permission-overview.tsx:166 (access-tokens/permission-detail-view.tsx:58 is the same with a fixed-width badge cell)"
        origin="raw"
        note="One table per permission group inside an accordion: a title row, then permission/badge pairs. The rows sit straight inside the table with no tbody, which React warns about. A description list wearing a table."
      >
        <div className="w-[400px]">
          <table className="w-full">
            <tbody>
              <tr>
                <th className="pb-2 text-left">Organization</th>
              </tr>
              {[
                { title: 'Describe organization', state: 'allowed' },
                { title: 'Modify organization slug', state: 'warned' },
                { title: 'Delete organization', state: 'denied' },
              ].map(permission => (
                <tr key={permission.title}>
                  <td>{permission.title}</td>
                  <td className="ml-2 text-right">
                    {permission.state === 'allowed' ? (
                      <Badge content="Allowed" variants={{ variant: 'success' }} />
                    ) : permission.state === 'warned' ? (
                      <Tooltip
                        trigger={
                          <span className="inline-flex">
                            <Badge content="Allowed" variants={{ variant: 'warning' }} />
                          </span>
                        }
                        content="Changing the slug breaks existing links."
                      />
                    ) : (
                      <Badge content="Denied" variants={{ variant: 'critical' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Cell types. Every body cell in the 41 tables (297 with headers) sorted by what it renders,
// one sample each in its shipped classes. The count is body cells of that kind; the sources
// are where to find them.
// ---------------------------------------------------------------------------

type CellType = {
  type: string;
  count: string;
  sources: string;
  note?: string;
  sample: React.ReactNode;
};

const CELL_TYPES: CellType[] = [
  {
    type: 'Text',
    count: '~60',
    sources: 'every table; versions, kinds, formatted dates, currency, status words',
    note: 'Regular weight, inherits the row size (text-sm in ui, text-xs in v2 rows and every DataTable).',
    sample: <span>1.4.2</span>,
  },
  {
    type: 'Text, medium',
    count: '~25',
    sources:
      'access tokens title, contracts name, roles name, invitations email, key/value labels, errors-and-changes names, support subject',
    note: 'The "name" column of a record. font-medium in ui, font-semibold in the composition summary and the raw headers.',
    sample: <span className="font-medium">CI publish</span>,
  },
  {
    type: 'Text, muted',
    count: '~20',
    sources:
      'roles description, invitations expiry, channels endpoint, DataTable type and age columns, "(unlimited seats)" asides',
    note: 'text-neutral-10, or text-neutral-11 in the DataTables. Sometimes the whole cell, sometimes a parenthetical after the main text.',
    sample: (
      <span>
        Base price <span className="text-neutral-10">(unlimited seats)</span>
      </span>
    ),
  },
  {
    type: 'Text, mono',
    count: '~30',
    sources:
      'token keys and aliases (masked with •), client id and secret, domain names, DNS values, every traces cell, alert incident counts and timestamps',
    note: 'font-mono, usually text-xs; the alert tables go to text-2xs / text-[11px] with tracking-wide.',
    sample: <span className="font-mono">hv2••••••••••••••••••••</span>,
  },
  {
    type: 'Text, mono chip',
    count: '3',
    sources: 'target-app-version.tsx: document hash, operation name, body excerpt',
    note: 'A mono value on a bg-neutral-5 rounded-sm p-1 background, like an inline code span.',
    sample: <span className="bg-neutral-5 rounded-sm p-1 font-mono text-xs">GetCart</span>,
  },
  {
    type: 'Number',
    count: '~35',
    sources:
      'errors-and-changes counts and percentages, insights p90/p95/p99/requests, plan summary money, usage, members count, explorer counts',
    note: 'Right- or centre-aligned by className or align, formatted before render. Bold in the explorer, plain elsewhere.',
    sample: <span className="block text-right">12,408</span>,
  },
  {
    type: 'Two-line text',
    count: '1',
    sources: 'members/list.tsx: display name over email',
    note: 'An h3 and a muted h4 in one cell, with provider icons inline after the name.',
    sample: (
      <div>
        <h3 className="line-clamp-1 text-sm font-medium">Ada Lovelace</h3>
        <h4 className="text-neutral-10 text-xs">ada@the-guild.dev</h4>
      </div>
    ),
  },
  {
    type: 'Link',
    count: '~12',
    sources:
      'apps (mono bold), affected deployments (neutral-11 to 12 on hover), explorer and insights (orange), support subject (Button link asChild), invoices Download, traces id',
    note: 'Six different link stylings for a cell whose content is a route. The traces id hides its tail with a transparent span so the underline stops at eight characters.',
    sample: (
      <span className="flex flex-col gap-1">
        <a href="#" className="font-mono text-xs font-bold">
          checkout-web@1.4.2
        </a>
        <a href="#" className="text-orange-800 dark:text-orange-500">
          a91f_GetCart
        </a>
      </span>
    ),
  },
  {
    type: 'Badge',
    count: '~14',
    sources:
      'apps status, access token scope, traces Ok/Error, permissions Allowed/Denied, channel type, contract tag chips, alerts Paused, apps last-used pill',
    note: 'A base Badge on its own, or a wrapped list of them for tags. The last-used pill carries a tooltip with the exact time.',
    sample: (
      <span className="inline-flex flex-wrap gap-1">
        <Badge content="active" variants={{ variant: 'secondary' }} />
        <Badge content="Allowed" variants={{ variant: 'success' }} />
        <Badge content="public" />
      </span>
    ),
  },
  {
    type: 'Status: dot and label',
    count: '3',
    sources: 'alert rules and activity tables: severity',
    sample: (
      <span className="text-neutral-12 inline-flex items-center gap-1.5 text-xs">
        <StatusDot color="critical" />
        Critical
      </span>
    ),
  },
  {
    type: 'Status: word and icon',
    count: '5',
    sources:
      'OIDC domains Verified / Pending, contracts Active / Inactive with an info popover, save-proposal error / loading / complete, support Status and Priority',
    note: 'A word coloured by state with an icon before or after it, sometimes a tooltip on the pending state.',
    sample: (
      <span className="flex flex-col gap-1 text-sm">
        <span>
          Verified <Check size="12" className="inline-block" />
        </span>
        <span className="flex items-center gap-1">
          <TriangleAlert className="size-4 text-red-500" /> Composition failed
        </span>
      </span>
    ),
  },
  {
    type: 'Status: transition',
    count: '2',
    sources: 'alert activity and events: from-state, arrow, to-state',
    sample: (
      <div className="text-neutral-11 inline-flex items-center gap-2">
        <Badge content="OK" variants={{ variant: 'success' }} />
        <ArrowRight className="text-neutral-8 size-3.5" />
        <Badge content="Firing" variants={{ variant: 'critical' }} />
      </div>
    ),
  },
  {
    type: 'Boolean icon',
    count: '1',
    sources: 'contracts: remove unreachable types',
    sample: (
      <span className="flex gap-4">
        <Check className="size-4" />
        <X className="size-4" />
      </span>
    ),
  },
  {
    type: 'Leading avatar',
    count: '3',
    sources:
      'members list (its own w-12 cell), alert rules and activity Created by (inline with the name)',
    sample: (
      <span className="text-neutral-12 inline-flex items-center gap-2 text-xs">
        <Avatar size="xs" alt="Ada Lovelace" />
        Ada Lovelace
      </span>
    ),
  },
  {
    type: 'Text with trailing adornment',
    count: '6',
    sources:
      'roles name + lock tooltip + default badge, alert rule name + Paused badge, destination + info popover, traces timestamp with tooltip, explorer anonymous in italics with tooltip',
    note: 'The text is the value; the thing after it explains or qualifies it.',
    sample: (
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        Admin
        <Tooltip
          trigger={
            <span className="inline-flex">
              <Lock className="size-4" />
            </span>
          }
          content="This role is locked"
        />
        <Badge content="default" variants={{ variant: 'outline' }} />
      </span>
    ),
  },
  {
    type: 'Copyable value',
    count: '6',
    sources: 'OIDC endpoints, DNS record type, name and value',
    sample: (
      <span className="font-mono font-medium">
        TXT <CopyIconButton label="Copy" value="TXT" />
      </span>
    ),
  },
  {
    type: 'Relative time',
    count: '~18',
    sources:
      'created / last used with TimeAgo (tokens, contracts, CDN), DateWithTimeAgo (apps, deployments), TokenExpiration, alert ages in mono, formatted dates (invoices, invitations)',
    note: 'Four ways to say when: a bare TimeAgo, a prefixed "created <TimeAgo>", a date plus relative, and a preformatted string.',
    sample: (
      <span className="flex flex-col gap-1 text-xs">
        <span>
          created <TimeAgo date="2026-08-20T10:00:00.000Z" />
        </span>
        <DateWithTimeAgo date="2026-08-30T09:12:00.000Z" />
      </span>
    ),
  },
  {
    type: 'Empty placeholder',
    count: '~10',
    sources:
      'missing dates (—), Created by (—), destination (—), "not used yet", "none set", "none", "None", "----"',
    note: 'Seven spellings of nothing, in neutral-10 or neutral-8.',
    sample: <span className="text-neutral-10 text-xs">—</span>,
  },
  {
    type: 'Checkbox',
    count: '5',
    sources:
      'alerts, channels, registry tokens (a width=1 first cell), proposal confirmations (centred, size sm)',
    sample: <Checkbox checked onCheckedChange={() => {}} />,
  },
  {
    type: 'Actions menu',
    count: '6',
    sources:
      'access tokens ×3 (bare button, Ellipsis), invitations and roles (ghost size-8, MoreHorizontal, sr-only label), contracts, app version (icon-sm)',
    note: 'Right-aligned last cell, three trigger stylings for the same menu.',
    sample: (
      <Menu
        align="end"
        width="sm"
        trigger={
          <Button variant="ghost" className="data-[popup-open]:bg-neutral-3 flex size-8 p-0">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        }
        sections={[[{ label: 'View Details', onClick: () => {} }]]}
      />
    ),
  },
  {
    type: 'Icon button',
    count: '2',
    sources: 'CDN tokens delete (ghost, red on hover), OIDC domains manage (icon-xs with tooltip)',
    sample: (
      <span className="flex items-center gap-2">
        <Button className="hover:text-red-500" variant="ghost" aria-label="Delete token">
          <Trash2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Manage">
          <Settings size="10" />
        </Button>
      </span>
    ),
  },
  {
    type: 'Bar',
    count: '2',
    sources: 'usage and insights traffic: Scale',
    sample: (
      <span className="block w-32">
        <Scale value={38} size={10} max={100} className="justify-end" />
      </span>
    ),
  },
  {
    type: 'Inline editor',
    count: '1',
    sources: 'manage filters name cell: swaps to an Input and two buttons while renaming',
    sample: <span className="text-neutral-10 text-xs">see Compact fields</span>,
  },
  {
    type: 'Full-width row',
    count: '5',
    sources:
      'traces "No results." and spinner rows, members empty states (h3 and p at py-16), DataTable emptyMessage and expanded panel',
    note: 'A colSpan cell that is a message or a panel rather than a value.',
    sample: <span className="text-neutral-10 block text-center">No results.</span>,
  },
];

export const CellTypes = createPreview({
  label: 'Cell types',
  render: () => (
    <CallSite
      source="297 cells across the 41 tables, body cells classified by content"
      origin="ui"
      note="One sample per kind in its shipped classes. Row-level modifiers are not cells but colour them: a solved ticket mutes its row, a disabled contract sets opacity-30 per cell, a disabled member strikes through the name and tints the row, a selected trace tints it. Header cells are their own short list: plain label (75), sortable (three implementations), label with tooltip or info popover, empty (actions column), colSpan, group title, and the plan total in a TFoot."
    >
      <div className="w-[64rem]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[16rem]">Sample</TableHead>
              <TableHead className="w-[12rem]">Kind</TableHead>
              <TableHead className="w-[3rem] text-right">Cells</TableHead>
              <TableHead>Where, and what varies</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CELL_TYPES.map(cell => (
              <TableRow key={cell.type}>
                <TableCell>{cell.sample}</TableCell>
                <TableCell className="font-medium">{cell.type}</TableCell>
                <TableCell className="text-right">{cell.count}</TableCell>
                <TableCell className="text-neutral-11 text-xs">
                  {cell.sources}
                  {cell.note ? <span className="text-neutral-10 block">{cell.note}</span> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CallSite>
  ),
});

export const ClassNameVocabulary = createPreview({
  label: 'className vocabulary',
  render: () => (
    <CallSite
      source="31 of 44 TableHeads, 39 of 51 TableCells"
      origin="ui"
      note="The className vocabulary in one place. Alignment is written both ways for the same result: text-right 19 times, text-end 8. Widths are pinned per column with w-[150px] and w-[200px] or percentages under table-fixed. Responsive hiding is hidden sm:table-cell. All of it is column configuration, expressed one cell at a time; v2 says the same with an align prop."
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
