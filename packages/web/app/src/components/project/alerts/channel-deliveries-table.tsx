import { useMemo } from 'react';
import { DELIVERY_EVENT_LABEL } from '@/components/common/deliveries/delivery-event-label';
import { DeliveryMetadata } from '@/components/common/deliveries/delivery-metadata';
import {
  DeliveryStatusCell,
  statusLabel,
} from '@/components/common/deliveries/delivery-status-cell';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import type { DeliveryEvent } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

export type ChannelDeliveryRow = {
  timestamp: string;
  event: DeliveryEvent;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  durationMs: number;
  attempt: number;
  /** What Hive sent to identify the call: request headers, or the Slack message metadata. */
  metadata: Record<string, unknown>;
};

export type ChannelDeliveryTarget = { id: string; slug: string };

/** A header's value, by its webhook name or its Slack metadata form (`Hive-Target-ID` / `hive_target_id`). */
export function metadataValue(metadata: Record<string, unknown>, header: string): string | null {
  const value = metadata[header] ?? metadata[header.toLowerCase().replace(/-/g, '_')];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function ChannelDeliveriesTable({
  deliveries,
  targets,
}: {
  /** Null when the delivery history could not be read. */
  deliveries: ChannelDeliveryRow[] | null;
  targets: ChannelDeliveryTarget[];
}) {
  const { organizationSlug, projectSlug } = useSlugs('project');

  const columns = useMemo((): ColumnDef<ChannelDeliveryRow, unknown>[] => {
    const slugOf = (targetId: string | null) =>
      targets.find(target => target.id === targetId)?.slug ?? null;

    return [
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
        cell: ({ row }) => {
          return (
            <DataTableCell
              kind="badge"
              items={{ content: DELIVERY_EVENT_LABEL[row.original.event], variant: 'secondary' }}
            />
          );
        },
      },
      {
        id: 'target',
        header: 'Target',
        cell: ({ row }) => {
          const targetId = metadataValue(row.original.metadata, 'Hive-Target-ID');
          const targetSlug = slugOf(targetId);
          if (targetSlug) {
            return (
              <DataTableCell
                kind="link"
                label={targetSlug}
                link={{
                  to: '/$organizationSlug/$projectSlug/$targetSlug',
                  params: { organizationSlug, projectSlug, targetSlug },
                }}
              />
            );
          }
          if (targetId) {
            return <DataTableCell kind="text" value={targetId} tone="muted" mono truncate />;
          }
          return <DataTableCell kind="placeholder" />;
        },
      },
      {
        id: 'status',
        header: 'Status',
        meta: { width: 'fill' },
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
            <DataTableCell kind="text" value={String(row.original.attempt)} />
          ) : (
            <DataTableCell kind="placeholder" />
          ),
      },
    ];
  }, [organizationSlug, projectSlug, targets]);

  if (!deliveries) {
    return <p className="text-sm text-fg-secondary">Delivery history is unavailable right now.</p>;
  }

  return (
    <DataTable
      data={deliveries}
      pagination={{ kind: 'client', pageSize: 10 }}
      columns={columns}
      getRowId={row =>
        `${row.timestamp}:${metadataValue(row.metadata, 'Hive-Request-ID') ?? ''}:${row.attempt}`
      }
      emptyMessage="No deliveries in this range."
      renderSubComponent={row => (
        <ChannelDeliveryMetadata delivery={row.original} targets={targets} />
      )}
    />
  );
}

/** The headers or Slack metadata sent, with the schema version id linked to its history page. */
function ChannelDeliveryMetadata({
  delivery,
  targets,
}: {
  delivery: ChannelDeliveryRow;
  targets: ChannelDeliveryTarget[];
}) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const targetSlug =
    targets.find(target => target.id === metadataValue(delivery.metadata, 'Hive-Target-ID'))
      ?.slug ?? null;

  return (
    <DeliveryMetadata
      title={'event_type' in delivery.metadata ? 'Message metadata' : 'Headers sent'}
      metadata={delivery.metadata}
      describe={(key, value) =>
        (key === 'Hive-Schema-ID' || key === 'hive_schema_id') && targetSlug ? (
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
            params={{ organizationSlug, projectSlug, targetSlug, versionId: value }}
            className="text-accent hover:text-accent-muted"
          >
            {value}
          </Link>
        ) : (
          value
        )
      }
    />
  );
}
