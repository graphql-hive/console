import { useState } from 'react';
import { Check, CircleAlert, Lock, Settings, Trash2 } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite } from '@/components/inventory/shared';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { DescriptionList } from '../description-list/description-list';
import { Tooltip } from '../floating/tooltip/tooltip';
import { DataTable } from './data-table';
import { DataTableCell } from './data-table-cell';

export const nav: NavPath = 'Base/DataTable/Proposed';

/**
 * Every table shape in the app, rebuilt on the proposed DataTable and DataTableCell API before
 * any call site moves. Each preview names the site it stands for; the old rendering is in
 * `Inventory/DataLayout` under the same shape name. Links are plain hrefs: the router is not here.
 */

const hoursAgo = (hours: number) =>
  new Date(Date.UTC(2026, 8, 15, 9, 0, 0) - hours * 3_600_000).toISOString();

// ---------------------------------------------------------------------------
// Bordered record lists
// ---------------------------------------------------------------------------

type Deployment = {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'pending' | 'retired';
  docs: number;
  createdAt: string;
  activatedAt: string | null;
  lastUsed: string | null;
};

const DEPLOYMENTS: Deployment[] = [
  {
    id: 'd1',
    name: 'checkout-web',
    version: '1.4.2',
    status: 'active',
    docs: 128,
    createdAt: hoursAgo(300),
    activatedAt: hoursAgo(298),
    lastUsed: hoursAgo(2),
  },
  {
    id: 'd2',
    name: 'admin-portal',
    version: '0.9.0',
    status: 'pending',
    docs: 42,
    createdAt: hoursAgo(20),
    activatedAt: null,
    lastUsed: null,
  },
  {
    id: 'd3',
    name: 'ios',
    version: '7.2.0',
    status: 'retired',
    docs: 310,
    createdAt: hoursAgo(2000),
    activatedAt: hoursAgo(1990),
    lastUsed: hoursAgo(700),
  },
];

const DEPLOYMENT_COLUMNS: ColumnDef<Deployment, any>[] = [
  {
    accessorKey: 'name',
    header: 'App@Version',
    meta: { width: 'fill' },
    cell: ({ row }) => (
      <DataTableCell
        kind="link"
        label={`${row.original.name}@${row.original.version}`}
        href="#"
        mono
      />
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { align: 'center', hideBelow: 'sm' },
    cell: ({ row }) => (
      <DataTableCell kind="badge" items={{ content: row.original.status, variant: 'secondary' }} />
    ),
  },
  {
    accessorKey: 'docs',
    header: 'Documents',
    meta: { align: 'center', width: 'xs' },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.docs} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    meta: { sortable: true, hideBelow: 'sm' },
    cell: ({ row }) => (
      <DataTableCell kind="time" date={row.original.createdAt} mode="relative-info" />
    ),
  },
  {
    accessorKey: 'activatedAt',
    header: 'Activated',
    meta: { sortable: true, hideBelow: 'sm' },
    cell: ({ row }) =>
      row.original.activatedAt ? (
        <DataTableCell kind="time" date={row.original.activatedAt} mode="relative-info" />
      ) : (
        <DataTableCell kind="placeholder" />
      ),
  },
  {
    accessorKey: 'lastUsed',
    header: 'Last used',
    meta: {
      sortable: true,
      align: 'right',
      tooltip: 'Last time a request was sent for this app. Requires usage reporting being set up.',
    },
    cell: ({ row }) =>
      row.original.lastUsed ? (
        <DataTableCell kind="time" date={row.original.lastUsed} mode="relative-info" />
      ) : (
        <DataTableCell kind="placeholder" />
      ),
  },
];

function AppDeployments() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  return (
    <DataTable
      data={DEPLOYMENTS}
      columns={DEPLOYMENT_COLUMNS}
      getRowId={row => row.id}
      sorting={{ state: sorting, onChange: setSorting, manual: true }}
      pagination={{
        kind: 'cursor',
        hasPreviousPage: false,
        hasNextPage: true,
        onPrevious: () => {},
        onNext: () => {},
        summary: 'Showing 3 of 14 deployments',
      }}
    />
  );
}

type Token = {
  id: string;
  title: string;
  key: string;
  scope: string;
  createdAt: string;
  expiresAt: string | null;
};

const TOKENS: Token[] = [
  {
    id: 't1',
    title: 'CI publish',
    key: 'hv1',
    scope: 'organization',
    createdAt: hoursAgo(600),
    expiresAt: null,
  },
  {
    id: 't2',
    title: 'Laptop',
    key: 'hv2',
    scope: 'project',
    createdAt: hoursAgo(100),
    expiresAt: hoursAgo(-720),
  },
];

const TOKEN_COLUMNS: ColumnDef<Token, any>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.title} weight="medium" />,
  },
  {
    accessorKey: 'key',
    header: 'Private Key',
    cell: ({ row }) => (
      <DataTableCell kind="text" value={`${row.original.key}••••••••••••••••••••`} mono />
    ),
  },
  {
    accessorKey: 'scope',
    header: 'Scope',
    cell: ({ row }) => (
      <DataTableCell kind="badge" items={{ content: row.original.scope, variant: 'success' }} />
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.createdAt} />,
  },
  {
    accessorKey: 'expiresAt',
    header: 'Expiration',
    cell: ({ row }) =>
      row.original.expiresAt ? (
        <DataTableCell kind="time" date={row.original.expiresAt} prefix="expires" mode="absolute" />
      ) : (
        <DataTableCell kind="text" value="Never" tone="muted" />
      ),
  },
  {
    id: 'actions',
    meta: { width: 'xs' },
    cell: () => (
      <DataTableCell
        kind="actions"
        sections={[
          [
            { label: 'View Details', onClick: () => {} },
            { label: 'Delete', variant: 'destructiveAction', onClick: () => {} },
          ],
        ]}
      />
    ),
  },
];

type Ticket = {
  id: string;
  subject: string;
  status: 'open' | 'solved';
  priority: 'normal' | 'high' | 'urgent';
  updatedAt: string;
};

const TICKETS: Ticket[] = [
  {
    id: '4821',
    subject: 'Schema check stuck in pending',
    status: 'open',
    priority: 'high',
    updatedAt: hoursAgo(30),
  },
  {
    id: '4790',
    subject: 'CDN token rotation question',
    status: 'solved',
    priority: 'normal',
    updatedAt: hoursAgo(300),
  },
];

const PRIORITY_DOT = { normal: 'info', high: 'warning', urgent: 'critical' } as const;

const TICKET_COLUMNS: ColumnDef<Ticket, any>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    meta: { align: 'center', width: 'xs' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.id} mono />,
  },
  {
    accessorKey: 'subject',
    header: 'Subject',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="link" label={row.original.subject} href="#" />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { align: 'center', width: 'sm' },
    cell: ({ row }) => (
      <DataTableCell
        kind="badge"
        items={{
          content: row.original.status,
          variant: row.original.status === 'open' ? 'info' : 'success',
        }}
      />
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    meta: { width: 'sm' },
    cell: ({ row }) => (
      <DataTableCell
        kind="status"
        label={row.original.priority}
        dot={PRIORITY_DOT[row.original.priority]}
      />
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Last updated',
    meta: { align: 'right', width: 'md' },
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.updatedAt} tone="muted" />,
  },
];

export const BorderedRecordLists = createPreview({
  label: 'Bordered record lists',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-apps.tsx:316"
        origin="base"
        note="Sortable Created, Activated and Last used with the page owning the sort (the API sorts); the Last used tooltip is on the column; Documents is a number column; missing dates are the placeholder. Cursor paging with the summary where the Load more used to be."
      >
        <div className="w-[56rem]">
          <AppDeployments />
        </div>
      </CallSite>
      <CallSite
        source="access-tokens-table.tsx:72 and the personal and project token tables"
        origin="base"
        note="Medium title, mono masked key, scope badge, a prefixed relative time, an absolute expiry, and the actions kind in a narrow last column."
      >
        <div className="w-[56rem]">
          <DataTable
            data={TOKENS}
            columns={TOKEN_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
          />
        </div>
      </CallSite>
      <CallSite
        source="pages/organization-support.tsx:341"
        origin="base"
        note="rowState mutes a solved ticket. Status is a badge and priority a dot, in place of the two app components; the widths are column meta rather than a class on every cell."
      >
        <div className="w-[56rem]">
          <DataTable
            data={TICKETS}
            columns={TICKET_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
            rowState={row => (row.status === 'solved' ? { muted: true } : undefined)}
          />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Stats panels
// ---------------------------------------------------------------------------

type Stat = {
  id: string;
  name: string;
  count: number;
  pct: number;
  targets: Array<{ label: string; href: string }>;
};

const STATS: Stat[] = [
  {
    id: 'a91f',
    name: 'a91f_GetCart',
    count: 12_408,
    pct: 38.2,
    targets: [{ label: 'production', href: '#' }],
  },
  {
    id: '0c3e',
    name: '0c3e_Checkout',
    count: 4102,
    pct: 12.6,
    targets: [
      { label: 'production', href: '#' },
      { label: 'staging', href: '#' },
      { label: 'development', href: '#' },
    ],
  },
];

const STAT_COLUMNS: ColumnDef<Stat, any>[] = [
  {
    accessorKey: 'name',
    header: 'Operation Name',
    meta: { width: 'fill' },
    cell: ({ row }) => (
      <DataTableCell
        kind="link-out"
        label={row.original.name}
        targets={row.original.targets}
        tooltip="Open in Insights"
        mono
      />
    ),
  },
  {
    accessorKey: 'count',
    header: 'Total Requests',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.count} />,
  },
  {
    accessorKey: 'pct',
    header: '% of traffic',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.pct} format="percent" />,
  },
];

export const StatsPanels = createPreview({
  label: 'Stats panels',
  render: () => (
    <CallSite
      source="target/history/errors-and-changes.tsx:351 and :410; target/explorer/common.tsx:152"
      origin="base"
      note="Two borderless tables in the flex row the panel already has. The operation name is text with a link-out icon: one target links straight to Insights with a tooltip, several open a menu on a chevron. No popover."
    >
      <div className="flex w-[56rem] gap-4">
        <div className="min-w-0 flex-1">
          <DataTable
            data={STATS}
            columns={STAT_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
            variants={{ bordered: false }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <DataTable
            data={[
              { id: 'web', name: 'web', count: 9880, pct: 30.4, targets: [] },
              { id: 'ios', name: 'ios', count: 6630, pct: 20.4, targets: [] },
            ]}
            columns={[
              {
                accessorKey: 'name',
                header: 'Client Name',
                meta: { width: 'fill' },
                cell: ({ row }) => (
                  <DataTableCell kind="text" value={row.original.name} weight="medium" />
                ),
              },
              ...STAT_COLUMNS.slice(1),
            ]}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
            variants={{ bordered: false }}
          />
        </div>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Key/value tables become DescriptionLists
// ---------------------------------------------------------------------------

export const KeyValue = createPreview({
  label: 'Key/value tables',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="oidc-integration-configuration.tsx:228"
        origin="base"
        note="The three endpoints as copyable descriptions, one per row, instead of a two-column table with a header that named its columns Endpoint and URL."
      >
        <div className="w-[42rem]">
          <DescriptionList
            rows={[
              {
                items: [
                  {
                    term: 'Sign-in redirect URI',
                    description: 'https://app.graphql-hive.com/auth/callback/oidc',
                    copyable: true,
                  },
                ],
              },
              {
                items: [
                  {
                    term: 'Sign-out redirect URI',
                    description: 'https://app.graphql-hive.com/logout',
                    copyable: true,
                  },
                ],
              },
              {
                items: [
                  {
                    term: 'Sign-in URL',
                    description: 'https://app.graphql-hive.com/auth/oidc?id=9c1f',
                    copyable: true,
                  },
                ],
              },
            ]}
          />
        </div>
      </CallSite>
      <CallSite
        source="oidc-registered-domain-sheet.tsx:320"
        origin="base"
        note="The DNS record: three copyable mono values on one row of three columns."
      >
        <div className="w-[42rem]">
          <DescriptionList
            rows={[
              {
                items: [
                  { term: 'Type', description: 'TXT', copyable: true },
                  { term: 'Name', description: '_hive-challenge.example.com', copyable: true },
                  {
                    term: 'Value',
                    description: 'hive-domain-verification=3af771c7',
                    copyable: true,
                  },
                ],
              },
            ]}
          />
        </div>
      </CallSite>
      <CallSite
        source="pages/native-composition-diff.tsx:251 and the traces GridTable"
        origin="base"
        note="Label and value pairs with no header, three in a row."
      >
        <div className="w-[42rem]">
          <DescriptionList
            rows={[
              {
                items: [
                  { term: 'Services', description: '7' },
                  { term: 'Composition Errors', description: '0' },
                  { term: 'Composition Duration', description: '412ms', mono: true },
                ],
              },
            ]}
          />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// TanStack-driven tables
// ---------------------------------------------------------------------------

type Trace = {
  id: string;
  timestamp: string;
  operation: string;
  duration: string;
  ok: boolean;
  method: string;
  status: number;
};

const TRACES: Trace[] = [
  {
    id: 'a91f3c2e8d0b4471',
    timestamp: hoursAgo(1),
    operation: 'query GetCart',
    duration: '38ms',
    ok: true,
    method: 'POST',
    status: 200,
  },
  {
    id: '0c3e77b1f2a94d10',
    timestamp: hoursAgo(1.1),
    operation: 'mutation Checkout',
    duration: '412ms',
    ok: false,
    method: 'POST',
    status: 500,
  },
  {
    id: 'e4d6b9f0a7c3e1d5',
    timestamp: hoursAgo(1.3),
    operation: 'query GetCart',
    duration: '41ms',
    ok: true,
    method: 'POST',
    status: 200,
  },
];

const TRACE_COLUMNS: ColumnDef<Trace, any>[] = [
  {
    accessorKey: 'id',
    header: 'Trace ID',
    cell: ({ row }) => (
      <DataTableCell kind="link" label={row.original.id.substring(0, 8)} href="#" mono />
    ),
  },
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    meta: { sortable: true },
    cell: ({ row }) => (
      <DataTableCell kind="time" date={row.original.timestamp} mode="absolute" mono />
    ),
  },
  {
    accessorKey: 'operation',
    header: 'Operation',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.operation} mono />,
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    meta: { sortable: true, align: 'right' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.duration} mono />,
  },
  {
    accessorKey: 'ok',
    header: 'Status',
    meta: { align: 'center' },
    cell: ({ row }) => (
      <DataTableCell
        kind="badge"
        items={{
          content: row.original.ok ? 'Ok' : 'Error',
          variant: row.original.ok ? 'success' : 'critical',
        }}
      />
    ),
  },
  {
    accessorKey: 'status',
    header: 'HTTP',
    meta: { align: 'center' },
    cell: ({ row }) => (
      <DataTableCell kind="text" value={`${row.original.method} ${row.original.status}`} mono />
    ),
  },
];

function TracesTable() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [selected, setSelected] = useState<string | undefined>(TRACES[1].id);
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={loading}
          onChange={event => setLoading(event.target.checked)}
        />
        Show the loading row instead
      </label>
      <DataTable
        data={TRACES}
        columns={TRACE_COLUMNS}
        getRowId={row => row.id}
        loading={loading}
        sorting={{ state: sorting, onChange: setSorting, manual: true }}
        selectedRowId={selected}
        onRowClick={row => setSelected(row.id)}
        hideRowIndicator
        pagination={{
          kind: 'cursor',
          hasPreviousPage: false,
          hasNextPage: true,
          onPrevious: () => {},
          onNext: () => {},
          summary: '3 traces',
        }}
      />
    </div>
  );
}

type Operation = {
  id: string;
  name: string;
  kind: string;
  p90: string;
  p99: string;
  requests: number;
  failure: number;
  traffic: number;
};

const OPERATIONS: Operation[] = [
  {
    id: 'o1',
    name: 'GetCart',
    kind: 'query',
    p90: '38ms',
    p99: '120ms',
    requests: 12_408,
    failure: 0.2,
    traffic: 38.2,
  },
  {
    id: 'o2',
    name: 'Checkout',
    kind: 'mutation',
    p90: '412ms',
    p99: '1.2s',
    requests: 4102,
    failure: 3.1,
    traffic: 12.6,
  },
  {
    id: 'o3',
    name: 'GetProduct',
    kind: 'query',
    p90: '22ms',
    p99: '80ms',
    requests: 3990,
    failure: 0,
    traffic: 12.3,
  },
];

const OPERATION_COLUMNS: ColumnDef<Operation, any>[] = [
  {
    accessorKey: 'name',
    header: 'Operations',
    meta: { width: 'fill' },
    cell: ({ row }) => (
      <DataTableCell kind="link" label={row.original.name} href="#" tone="accent" />
    ),
  },
  {
    accessorKey: 'kind',
    header: 'Kind',
    meta: { align: 'center' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.kind} tone="muted" />,
  },
  {
    accessorKey: 'p90',
    header: 'p90',
    meta: { align: 'right', sortable: true },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.p90} mono />,
  },
  {
    accessorKey: 'p99',
    header: 'p99',
    meta: { align: 'right', sortable: true },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.p99} mono />,
  },
  {
    accessorKey: 'failure',
    header: 'Failure Rate',
    meta: { align: 'right', sortable: true },
    cell: ({ row }) => (
      <DataTableCell kind="number" value={row.original.failure} format="percent" />
    ),
  },
  {
    accessorKey: 'requests',
    header: 'Requests',
    meta: { align: 'right', sortable: true },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.requests} />,
  },
  {
    accessorKey: 'traffic',
    header: 'Traffic',
    meta: {
      align: 'right',
      sortable: true,
      tooltip: 'Share of all requests in the selected period.',
    },
    cell: ({ row }) => (
      <DataTableCell kind="number" value={row.original.traffic} format="percent" />
    ),
  },
  {
    id: 'bar',
    meta: { width: 'sm' },
    cell: ({ row }) => <DataTableCell kind="bar" value={row.original.traffic} max={100} />,
  },
];

export const TanStackTables = createPreview({
  label: 'TanStack tables',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-traces.tsx:572"
        origin="base"
        note="Server-side sorting through the sorting prop, the selected trace through selectedRowId, the spinner through loading, and cursor paging in place of the Load more button under the table. Click a row."
      >
        <div className="w-[60rem]">
          <TracesTable />
        </div>
      </CallSite>
      <CallSite
        source="target/insights/list.tsx:241 (AdminStats.tsx:271 is the same pattern)"
        origin="base"
        note="Client-side sorting on the numeric columns, the Traffic explanation on the column, the bar as a cell kind, and numbered pages in place of the hand-built pager."
      >
        <div className="w-[60rem]">
          <DataTable
            data={OPERATIONS}
            columns={OPERATION_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'client', pageSize: 2 }}
          />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Checkbox lists
// ---------------------------------------------------------------------------

type Channel = { id: string; name: string; endpoint: string; type: string };

const CHANNELS: Channel[] = [
  { id: 'c1', name: 'Team Slack', endpoint: '#alerts', type: 'SLACK' },
  { id: 'c2', name: 'Ops webhook', endpoint: 'https://ops.internal/hooks/hive', type: 'WEBHOOK' },
  { id: 'c3', name: 'Escalation', endpoint: '#incident-room', type: 'SLACK' },
];

function ChannelsList() {
  const [checked, setChecked] = useState<string[]>(['c2']);
  const columns: ColumnDef<Channel, any>[] = [
    {
      id: 'select',
      meta: { width: 'xs' },
      cell: ({ row }) => (
        <DataTableCell
          kind="checkbox"
          checked={checked.includes(row.original.id)}
          onCheckedChange={on =>
            setChecked(prev =>
              on ? [...prev, row.original.id] : prev.filter(id => id !== row.original.id),
            )
          }
          label={`Select ${row.original.name}`}
        />
      ),
    },
    {
      accessorKey: 'name',
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.name} weight="medium" />,
    },
    {
      accessorKey: 'endpoint',
      meta: { width: 'fill' },
      cell: ({ row }) => (
        <DataTableCell kind="text" value={row.original.endpoint} tone="muted" truncate />
      ),
    },
    {
      accessorKey: 'type',
      cell: ({ row }) => (
        <DataTableCell kind="badge" items={{ content: row.original.type, variant: 'secondary' }} />
      ),
    },
  ];
  return (
    <DataTable
      data={CHANNELS}
      columns={columns}
      getRowId={row => row.id}
      pagination={{ kind: 'none' }}
    />
  );
}

type RegistryToken = {
  id: string;
  alias: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
};

const REGISTRY_TOKENS: RegistryToken[] = [
  {
    id: 'r1',
    alias: 'a91f••••••••••3c2e',
    name: 'CI publish',
    lastUsedAt: hoursAgo(30),
    createdAt: hoursAgo(600),
  },
  {
    id: 'r2',
    alias: '0c3e••••••••••7b1f',
    name: 'Laptop',
    lastUsedAt: null,
    createdAt: hoursAgo(100),
  },
];

const REGISTRY_COLUMNS: ColumnDef<RegistryToken, any>[] = [
  {
    id: 'select',
    meta: { width: 'xs' },
    cell: ({ row }) => (
      <DataTableCell
        kind="checkbox"
        checked={false}
        onCheckedChange={() => {}}
        label={`Select ${row.original.name}`}
      />
    ),
  },
  {
    accessorKey: 'alias',
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.alias} mono />,
  },
  {
    accessorKey: 'name',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.name} />,
  },
  {
    accessorKey: 'lastUsedAt',
    meta: { align: 'right' },
    cell: ({ row }) =>
      row.original.lastUsedAt ? (
        <DataTableCell kind="time" date={row.original.lastUsedAt} prefix="last used" />
      ) : (
        <DataTableCell kind="text" value="not used yet" tone="muted" />
      ),
  },
  {
    accessorKey: 'createdAt',
    meta: { align: 'right' },
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.createdAt} prefix="created" />,
  },
];

export const CheckboxLists = createPreview({
  label: 'Checkbox lists',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="alerts/channels-table.tsx:50 (alerts-table.tsx:29 is the same with different cells)"
        origin="base"
        note="No column has a header, so there is no header row. The stripes are the component's now rather than v2/Tr's."
      >
        <div className="w-[44rem]">
          <ChannelsList />
        </div>
      </CallSite>
      <CallSite
        source="pages/target-settings.tsx:168 (cdn-access-tokens.tsx:384 has an icon-button in the last column instead)"
        origin="base"
        note="Registry tokens, with the two prefixed relative times right-aligned."
      >
        <div className="w-[44rem]">
          <DataTable
            data={REGISTRY_TOKENS}
            columns={REGISTRY_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
          />
        </div>
      </CallSite>
      <CallSite
        source="target/settings/cdn-access-tokens.tsx:468"
        origin="base"
        note="The CDN token row: the delete action as an icon-button kind."
      >
        <div className="w-[44rem]">
          <DataTable
            data={[
              {
                id: 'k1',
                key: 'a91f••••••••••3c2e',
                alias: 'Edge cache',
                createdAt: hoursAgo(600),
              },
            ]}
            columns={[
              {
                accessorKey: 'key',
                cell: ({ row }) => <DataTableCell kind="text" value={row.original.key} mono />,
              },
              {
                accessorKey: 'alias',
                meta: { width: 'fill' },
                cell: ({ row }) => <DataTableCell kind="text" value={row.original.alias} />,
              },
              {
                accessorKey: 'createdAt',
                meta: { align: 'right' },
                cell: ({ row }) => (
                  <DataTableCell kind="time" date={row.original.createdAt} prefix="created" />
                ),
              },
              {
                id: 'delete',
                meta: { width: 'xs' },
                cell: () => (
                  <DataTableCell
                    kind="icon-button"
                    icon={Trash2}
                    label="Delete token"
                    onClick={() => {}}
                    destructive
                  />
                ),
              },
            ]}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
          />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Headered lists
// ---------------------------------------------------------------------------

type PlanRow = {
  id: string;
  feature: string;
  aside?: string;
  units: string;
  unitPrice: number;
  total: number;
};

const PLAN_ROWS: PlanRow[] = [
  {
    id: 'base',
    feature: 'Base price',
    aside: '(unlimited seats)',
    units: '',
    unitPrice: 10,
    total: 10,
  },
  {
    id: 'included',
    feature: 'Included Operations',
    aside: '(free)',
    units: '1M',
    unitPrice: 0,
    total: 0,
  },
  { id: 'ops', feature: 'Operations', units: '12M', unitPrice: 10, total: 120 },
];

const PLAN_COLUMNS: ColumnDef<PlanRow, any>[] = [
  {
    accessorKey: 'feature',
    header: 'Feature',
    meta: { width: 'fill' },
    cell: ({ row }) => (
      <DataTableCell kind="text" value={row.original.feature} secondary={row.original.aside} />
    ),
  },
  {
    accessorKey: 'units',
    header: 'Units',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.units} />,
  },
  {
    accessorKey: 'unitPrice',
    header: 'Unit Price',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => (
      <DataTableCell kind="number" value={row.original.unitPrice} format="currency" />
    ),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.total} format="currency" />,
  },
];

type Invoice = {
  id: string;
  date: string;
  amount: number;
  status: string;
  start: string;
  end: string;
};

const INVOICES: Invoice[] = [
  {
    id: 'i1',
    date: hoursAgo(340),
    amount: 130,
    status: 'paid',
    start: hoursAgo(1080),
    end: hoursAgo(360),
  },
  {
    id: 'i2',
    date: hoursAgo(1080),
    amount: 130,
    status: 'paid',
    start: hoursAgo(1800),
    end: hoursAgo(1100),
  },
];

const INVOICE_COLUMNS: ColumnDef<Invoice, any>[] = [
  {
    accessorKey: 'date',
    header: 'Invoice Date',
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.date} mode="absolute" />,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    meta: { align: 'right' },
    cell: ({ row }) => (
      <DataTableCell kind="number" value={row.original.amount} format="currency" />
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <DataTableCell kind="badge" items={{ content: row.original.status, variant: 'success' }} />
    ),
  },
  {
    accessorKey: 'start',
    header: 'Period Start',
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.start} mode="absolute" />,
  },
  {
    accessorKey: 'end',
    header: 'Period End',
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.end} mode="absolute" />,
  },
  {
    id: 'pdf',
    header: 'PDF',
    cell: () => <DataTableCell kind="link" label="Download" href="#" tone="accent" external />,
  },
];

function ProposalConfirmations() {
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({
    products: true,
    users: false,
  });
  const rows = [
    {
      id: 'products',
      name: 'products',
      reason: 'Field Product.price changed type from Float to Money',
    },
    { id: 'users', name: 'users', reason: 'Type Address was removed' },
  ];
  const columns: ColumnDef<(typeof rows)[number], any>[] = [
    {
      id: 'confirm',
      header: 'Confirm',
      meta: { align: 'center', width: 'xs' },
      cell: ({ row }) => (
        <DataTableCell
          kind="checkbox"
          checked={confirmed[row.original.id] ?? false}
          onCheckedChange={on => setConfirmed(prev => ({ ...prev, [row.original.id]: on }))}
          label={`Confirm ${row.original.name}`}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: 'Schema',
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.name} mono />,
    },
    {
      accessorKey: 'reason',
      header: 'Change',
      meta: { width: 'fill' },
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.reason} />,
    },
  ];
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={row => row.id}
      pagination={{ kind: 'none' }}
    />
  );
}

export const HeaderedLists = createPreview({
  label: 'Headered lists',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="billing/PlanSummary.tsx:31"
        origin="base"
        note="The total is the footer prop; asides are the text kind's secondary; money is the number kind's currency format."
      >
        <div className="w-[44rem]">
          <DataTable
            data={PLAN_ROWS}
            columns={PLAN_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
            footer={{ label: 'Total monthly (after trial ends)', value: '$130.00' }}
          />
        </div>
      </CallSite>
      <CallSite
        source="billing/InvoicesList.tsx:38 (organization/Usage.tsx:51 is three columns with a bar)"
        origin="base"
        note="Absolute dates, a currency, a status badge and an external accent link."
      >
        <div className="w-[56rem]">
          <DataTable
            data={INVOICES}
            columns={INVOICE_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
          />
        </div>
      </CallSite>
      <CallSite
        source="pages/target-proposals-new.tsx:209 (save-proposal-modal.tsx:176 is two columns with a status icon)"
        origin="base"
        note="Inside a Modal at neutral-1, so the base surface. The colSpan header over two cells becomes two headers."
      >
        <div className="w-[44rem]">
          <ProposalConfirmations />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Raw tables
// ---------------------------------------------------------------------------

type Member = { id: string; name: string; email: string; role: 'owner' | 'group' };

const MEMBERS: Member[] = [
  { id: 'm1', name: 'Ada Lovelace', email: 'ada@the-guild.dev', role: 'owner' },
  { id: 'm2', name: 'Grace Hopper', email: 'grace@the-guild.dev', role: 'group' },
];

const MEMBER_COLUMNS: ColumnDef<Member, any>[] = [
  {
    accessorKey: 'name',
    header: 'Member',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="avatar" name={row.original.name} />,
  },
  {
    accessorKey: 'email',
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.email} tone="muted" />,
  },
  {
    accessorKey: 'role',
    meta: { align: 'right' },
    cell: ({ row }) =>
      row.original.role === 'owner' ? (
        <DataTableCell
          kind="text"
          value="Owner"
          weight="medium"
          trailing={
            <Tooltip
              trigger={<span className="text-neutral-9 inline-flex cursor-help text-xs">?</span>}
              content="The organization owner has full access to everything within the organization. The role of the owner can not be changed."
            />
          }
        />
      ) : (
        <DataTableCell kind="badge" items={{ content: 'Engineering', variant: 'secondary' }} />
      ),
  },
  {
    id: 'actions',
    meta: { width: 'xs' },
    cell: () => (
      <DataTableCell
        kind="actions"
        sections={[
          [
            { label: 'Change role', onClick: () => {} },
            { label: 'Remove', variant: 'destructiveAction', onClick: () => {} },
          ],
        ]}
      />
    ),
  },
];

type Role = {
  id: string;
  name: string;
  description: string;
  members: number;
  locked: boolean;
  isDefault: boolean;
};

const ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to the organization.',
    members: 2,
    locked: true,
    isDefault: false,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to every project.',
    members: 14,
    locked: false,
    isDefault: true,
  },
];

const ROLE_COLUMNS: ColumnDef<Role, any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: { width: 'md' },
    cell: ({ row }) => (
      <DataTableCell
        kind="text"
        value={row.original.name}
        weight="medium"
        trailing={
          <>
            {row.original.locked ? (
              <Tooltip
                trigger={
                  <span className="inline-flex">
                    <Lock className="size-3.5" />
                  </span>
                }
                content="Locked roles are created by the system and cannot be modified or deleted."
              />
            ) : null}
            {row.original.isDefault ? (
              <DataTableCell kind="badge" items={{ content: 'default', variant: 'outline' }} />
            ) : null}
          </>
        }
      />
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.description} tone="muted" />,
  },
  {
    accessorKey: 'members',
    header: 'Members',
    meta: { align: 'center', width: 'sm' },
    cell: ({ row }) => (
      <DataTableCell
        kind="text"
        value={`${row.original.members} ${row.original.members === 1 ? 'member' : 'members'}`}
      />
    ),
  },
  {
    id: 'actions',
    meta: { width: 'xs' },
    cell: () => (
      <DataTableCell
        kind="actions"
        sections={[
          [
            { label: 'Show', onClick: () => {} },
            { label: 'Edit', onClick: () => {} },
            { label: 'Delete', variant: 'destructiveAction', onClick: () => {} },
          ],
        ]}
      />
    ),
  },
];

type Permission = { id: string; title: string; state: 'allowed' | 'warned' | 'denied' };

const PERMISSIONS: Permission[] = [
  { id: 'p1', title: 'Describe organization', state: 'allowed' },
  { id: 'p2', title: 'Modify organization slug', state: 'warned' },
  { id: 'p3', title: 'Delete organization', state: 'denied' },
];

const PERMISSION_COLUMNS: ColumnDef<Permission, any>[] = [
  {
    accessorKey: 'title',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.title} />,
  },
  {
    accessorKey: 'state',
    meta: { align: 'right' },
    cell: ({ row }) =>
      row.original.state === 'denied' ? (
        <DataTableCell kind="badge" items={{ content: 'Denied', variant: 'critical' }} />
      ) : row.original.state === 'warned' ? (
        <Tooltip
          trigger={
            <span className="inline-flex">
              <DataTableCell kind="badge" items={{ content: 'Allowed', variant: 'warning' }} />
            </span>
          }
          content="Changing the slug breaks existing links."
        />
      ) : (
        <DataTableCell kind="badge" items={{ content: 'Allowed', variant: 'success' }} />
      ),
  },
];

export const RawTables = createPreview({
  label: 'Raw tables',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="members/list.tsx:689"
        origin="base"
        note="The member row: avatar with the name, muted email in its own column, owner or group on the right, actions. Only the first column has a header, as today."
      >
        <div className="w-[56rem]">
          <DataTable
            data={MEMBERS}
            columns={MEMBER_COLUMNS}
            getRowId={row => row.id}
            pagination={{
              kind: 'cursor',
              hasPreviousPage: false,
              hasNextPage: true,
              onPrevious: () => {},
              onNext: () => {},
              summary: 'Page 1',
            }}
          />
        </div>
      </CallSite>
      <CallSite
        source="members/roles.tsx:937 (invitations.tsx:505 is Email, Assigned role, Expiration date and actions)"
        origin="base"
        note="The lock tooltip and the default badge ride in the name cell's trailing slot."
      >
        <div className="w-[56rem]">
          <DataTable
            data={ROLES}
            columns={ROLE_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
          />
        </div>
      </CallSite>
      <CallSite
        source="members/selected-permission-overview.tsx:166, access-tokens/permission-detail-view.tsx:58"
        origin="base"
        note="Per permission group: a headerless two-column table, the group title above it as it is today, the state as a badge."
      >
        <div className="w-[26rem]">
          <h4 className="text-neutral-12 mb-2 text-sm font-medium">Organization</h4>
          <DataTable
            data={PERMISSIONS}
            columns={PERMISSION_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
            variants={{ bordered: false }}
          />
        </div>
      </CallSite>
      <CallSite
        source="oidc-integration-configuration.tsx:484"
        origin="base"
        note="Registered domains: a mono name, a status word with an icon (the pending one explains itself), and a manage icon-button."
      >
        <div className="w-[44rem]">
          <DataTable
            data={[
              { id: 'x1', domain: 'the-guild.dev', verified: true },
              { id: 'x2', domain: 'graphql-hive.com', verified: false },
            ]}
            columns={[
              {
                accessorKey: 'domain',
                header: 'Domain',
                meta: { width: 'fill' },
                cell: ({ row }) => (
                  <DataTableCell kind="text" value={row.original.domain} mono weight="medium" />
                ),
              },
              {
                accessorKey: 'verified',
                header: 'Status',
                cell: ({ row }) =>
                  row.original.verified ? (
                    <DataTableCell kind="status" label="Verified" icon={Check} iconTone="success" />
                  ) : (
                    <DataTableCell
                      kind="status"
                      label="Pending"
                      icon={CircleAlert}
                      iconTone="warning"
                      tooltip="The domain ownership challenge has not been completed."
                    />
                  ),
              },
              {
                id: 'manage',
                meta: { width: 'xs' },
                cell: () => (
                  <DataTableCell
                    kind="icon-button"
                    icon={Settings}
                    label="Manage"
                    onClick={() => {}}
                  />
                ),
              },
            ]}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
            emptyMessage="No Domains registered"
          />
        </div>
      </CallSite>
    </div>
  ),
});
