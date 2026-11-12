import { DELIVERY_EVENT_LABEL } from '@/components/common/deliveries/delivery-event-label';
import { DeliveryMetadata } from '@/components/common/deliveries/delivery-metadata';
import {
  DeliveryStatusCell,
  statusLabel,
} from '@/components/common/deliveries/delivery-status-cell';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import type { DeliveryEvent } from '@/gql/graphql';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import type { ColumnDef } from '@tanstack/react-table';

export type EmailDeliveryRow = {
  timestamp: string;
  event: DeliveryEvent;
  /** The recipient address. */
  destination: string;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  durationMs: number;
  attempt: number;
  maxAttempts: number;
  /** The subject and the ids that locate the message; never the body or a link. */
  metadata: Record<string, unknown>;
};

const columns: ColumnDef<EmailDeliveryRow, unknown>[] = [
  {
    id: 'time',
    header: 'Time',
    cell: ({ row }) => (
      <DataTableCell kind="time" date={row.original.timestamp} mode="absolute" mono />
    ),
  },
  {
    id: 'event',
    header: 'Event',
    cell: ({ row }) => (
      <DataTableCell
        kind="badge"
        items={{ content: DELIVERY_EVENT_LABEL[row.original.event], variant: 'secondary' }}
      />
    ),
  },
  {
    id: 'recipient',
    header: 'Recipient',
    meta: { width: 'fill' },
    cell: ({ row }) => (
      <DataTableCell
        kind="text"
        value={<span title={row.original.destination}>{row.original.destination}</span>}
        mono
        truncate
      />
    ),
  },
  {
    id: 'status',
    header: 'Status',
    meta: { width: 'lg' },
    cell: ({ row }) => (
      <DeliveryStatusCell ok={row.original.ok} label={statusLabel(row.original)} />
    ),
  },
  {
    id: 'duration',
    header: 'Duration',
    cell: ({ row }) => (
      <DataTableCell
        kind="text"
        value={formatDuration(row.original.durationMs, true)}
        tone="muted"
        mono
      />
    ),
  },
  {
    id: 'attempt',
    header: 'Attempt',
    meta: { align: 'center' },
    cell: ({ row }) =>
      row.original.attempt > 1 ? (
        <DataTableCell
          kind="text"
          value={`${row.original.attempt} of ${row.original.maxAttempts}`}
        />
      ) : (
        <DataTableCell kind="placeholder" />
      ),
  },
];

export function EmailDeliveriesTable({
  deliveries,
}: {
  /** Null when the delivery history could not be read. */
  deliveries: EmailDeliveryRow[] | null;
}) {
  if (!deliveries) {
    return <p className="text-sm text-fg-secondary">Delivery history is unavailable right now.</p>;
  }

  return (
    <DataTable
      data={deliveries}
      pagination={{ kind: 'client', pageSize: 10 }}
      columns={columns}
      getRowId={row =>
        `${row.timestamp}:${row.destination}:${row.attempt}:${String(row.metadata.job_id ?? '')}`
      }
      emptyMessage="No emails in this range."
      renderSubComponent={row => (
        <DeliveryMetadata title="Details" metadata={row.original.metadata} />
      )}
    />
  );
}
