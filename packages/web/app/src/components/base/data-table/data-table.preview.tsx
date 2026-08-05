import { createPreview, type NavPath } from 'react-foundry';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../badge/badge';
import { DataTable } from './data-table';

export const nav: NavPath = 'Base/DataTable';

type Check = {
  id: string;
  service: string;
  author: string;
  status: 'passed' | 'failed' | 'pending';
  changes: number;
};

const SERVICES = ['checkout', 'accounts', 'catalog', 'shipping', 'reviews', 'search'];
const AUTHORS = ['jon', 'kamil', 'dotan', 'laurin'];

const CHECKS: Check[] = Array.from({ length: 47 }, (_, i) => ({
  id: `chk_${(1000 + i).toString(16)}`,
  service: SERVICES[i % SERVICES.length],
  author: AUTHORS[i % AUTHORS.length],
  status: i % 7 === 0 ? 'failed' : i % 11 === 0 ? 'pending' : 'passed',
  changes: (i * 3) % 14,
}));

const STATUS_VARIANT = {
  passed: 'secondary',
  failed: 'destructive',
  pending: 'outline',
} as const;

const COLUMNS: ColumnDef<Check, any>[] = [
  { accessorKey: 'id', header: 'Check' },
  { accessorKey: 'service', header: 'Service' },
  { accessorKey: 'author', header: 'Author' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
    ),
  },
  { accessorKey: 'changes', header: 'Changes' },
];

export const Default = createPreview(() => (
  <div className="w-[44rem]">
    <DataTable data={CHECKS.slice(0, 6)} columns={COLUMNS} getRowId={row => row.id} />
  </div>
));

/** Pagination only renders once the row count exceeds `pageSize`. */
export const Paginated = createPreview(() => (
  <div className="w-[44rem]">
    <DataTable data={CHECKS} columns={COLUMNS} pageSize={8} getRowId={row => row.id} />
  </div>
));

/** `renderSubComponent` makes rows expandable and adds the trailing chevron. */
export const Expandable = createPreview(() => (
  <div className="w-[44rem]">
    <DataTable
      data={CHECKS.slice(0, 6)}
      columns={COLUMNS}
      getRowId={row => row.id}
      renderSubComponent={row => (
        <div className="text-neutral-11 space-y-1 text-[13px]">
          <div>
            Composition for <span className="text-neutral-12">{row.original.service}</span> produced{' '}
            {row.original.changes} schema changes.
          </div>
          <div className="text-neutral-9">Check id: {row.original.id}</div>
        </div>
      )}
    />
  </div>
));

export const Clickable = createPreview(() => (
  <div className="w-[44rem]">
    <DataTable
      data={CHECKS.slice(0, 6)}
      columns={COLUMNS}
      getRowId={row => row.id}
      onRowClick={() => {}}
    />
  </div>
));

/** Rows stay clickable, but the trailing chevron column is dropped. */
export const NoRowIndicator = createPreview(() => (
  <div className="w-[44rem]">
    <DataTable
      data={CHECKS.slice(0, 6)}
      columns={COLUMNS}
      getRowId={row => row.id}
      onRowClick={() => {}}
      hideRowIndicator
    />
  </div>
));

export const Empty = createPreview(() => (
  <div className="w-[44rem]">
    <DataTable
      data={[]}
      columns={COLUMNS}
      getRowId={row => row.id}
      emptyMessage="No schema checks have run for this target yet."
    />
  </div>
));
