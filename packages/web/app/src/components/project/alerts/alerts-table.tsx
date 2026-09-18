import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import type { ColumnDef } from '@tanstack/react-table';

export const AlertsTable_AlertFragment = graphql(`
  fragment AlertsTable_AlertFragment on Alert {
    id
    type
    channel {
      id
      name
      type
    }
    target {
      id
      slug
    }
  }
`);

type Alert = DocumentType<typeof AlertsTable_AlertFragment>;

/** "SCHEMA_CHANGE_NOTIFICATIONS" reads as "Schema Change Notifications". */
function alertTypeLabel(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AlertsTable(props: {
  alerts: FragmentType<typeof AlertsTable_AlertFragment>[];
  isChecked: (alertId: string) => boolean;
  onCheckedChange: (alertId: string, checked: boolean) => void;
}) {
  const alerts = useFragment(AlertsTable_AlertFragment, props.alerts);

  const columns: ColumnDef<Alert, unknown>[] = [
    {
      id: 'select',
      meta: { width: 'xs' },
      cell: ({ row }) => (
        <DataTableCell
          kind="checkbox"
          checked={props.isChecked(row.original.id)}
          onCheckedChange={checked => props.onCheckedChange(row.original.id, checked)}
          label={`Select ${alertTypeLabel(row.original.type)} on ${row.original.target.slug}`}
        />
      ),
    },
    {
      id: 'type',
      cell: ({ row }) => (
        <DataTableCell kind="text" value={alertTypeLabel(row.original.type)} weight="medium" />
      ),
    },
    {
      id: 'channel',
      meta: { width: 'fill' },
      cell: ({ row }) => (
        <DataTableCell kind="text" value={`Channel: ${row.original.channel.name}`} />
      ),
    },
    {
      id: 'target',
      cell: ({ row }) => (
        <DataTableCell kind="text" value={`Target: ${row.original.target.slug}`} tone="muted" />
      ),
    },
  ];

  return (
    <DataTable
      data={[...alerts]}
      columns={columns}
      getRowId={alert => alert.id}
      pagination={{ kind: 'none' }}
      emptyMessage="No alerts yet."
    />
  );
}
