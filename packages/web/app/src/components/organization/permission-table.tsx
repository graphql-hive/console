import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import type { ColumnDef } from '@tanstack/react-table';

export type PermissionRow = {
  id: string;
  title: string;
  granted: boolean;
  /** Why granting this needs care; shown on the badge when set. */
  warning?: string | null;
};

const PERMISSION_COLUMNS: ColumnDef<PermissionRow, unknown>[] = [
  {
    id: 'title',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.title} />,
  },
  {
    id: 'state',
    meta: { align: 'right' },
    cell: ({ row }) => {
      if (!row.original.granted) {
        return <DataTableCell kind="badge" items={{ content: 'Denied', variant: 'critical' }} />;
      }
      if (row.original.warning) {
        return (
          <Tooltip
            trigger={
              <span className="inline-flex">
                <DataTableCell kind="badge" items={{ content: 'Allowed', variant: 'warning' }} />
              </span>
            }
            content={row.original.warning}
          />
        );
      }
      return <DataTableCell kind="badge" items={{ content: 'Allowed', variant: 'success' }} />;
    },
  },
];

/** One permission group as a headerless list of permissions with their granted state. */
export function PermissionTable(props: { title: string; permissions: PermissionRow[] }) {
  return (
    <div>
      <h4 className="text-neutral-12 mb-2 text-sm font-medium">{props.title}</h4>
      <DataTable
        data={props.permissions}
        columns={PERMISSION_COLUMNS}
        getRowId={permission => permission.id}
        pagination={{ kind: 'none' }}
        variants={{ bordered: false }}
      />
    </div>
  );
}
