import { useMemo, type ReactNode } from 'react';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';
import { AlertChannelDeliveryEvent } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

export type ChannelDeliveryRow = {
  timestamp: string;
  event: AlertChannelDeliveryEvent;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  durationMs: number;
  attempt: number;
  /** What Hive sent to identify the call: request headers, or the Slack message metadata. */
  metadata: Record<string, unknown>;
};

export type ChannelDeliveryTarget = { id: string; slug: string };

const EVENT_LABEL: Record<AlertChannelDeliveryEvent, string> = {
  [AlertChannelDeliveryEvent.SchemaChange]: 'Schema change',
  [AlertChannelDeliveryEvent.MetricAlert]: 'Metric alert',
  [AlertChannelDeliveryEvent.ChannelConfirmation]: 'Channel confirmation',
};

/** A header's value, by its webhook name or its Slack metadata form (`Hive-Target-ID` / `hive_target_id`). */
export function metadataValue(metadata: Record<string, unknown>, header: string): string | null {
  const value = metadata[header] ?? metadata[header.toLowerCase().replace(/-/g, '_')];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function statusLabel(row: ChannelDeliveryRow): string {
  return row.statusCode ? `${row.statusCode} ${row.statusText}` : row.statusText;
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
              items={{ content: EVENT_LABEL[row.original.event], variant: 'secondary' }}
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
          <DataTableCell
            kind="status"
            dot={row.original.ok ? 'success' : 'critical'}
            label={statusLabel(row.original)}
          />
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
      renderSubComponent={row => <DeliveryMetadata delivery={row.original} targets={targets} />}
    />
  );
}

function DeliveryMetadata({
  delivery,
  targets,
}: {
  delivery: ChannelDeliveryRow;
  targets: ChannelDeliveryTarget[];
}) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const entries = Object.entries(delivery.metadata).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  const targetSlug =
    targets.find(target => target.id === metadataValue(delivery.metadata, 'Hive-Target-ID'))
      ?.slug ?? null;

  // Every value copies, labelled by its header as the list shows it.
  const describe = (key: string, value: string): ReactNode => {
    const isSchemaId = key === 'Hive-Schema-ID' || key === 'hive_schema_id';
    return (
      <span className="inline-flex items-center gap-1">
        {isSchemaId && targetSlug ? (
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
            params={{ organizationSlug, projectSlug, targetSlug, versionId: value }}
            className="text-accent hover:text-accent-muted"
          >
            {value}
          </Link>
        ) : (
          value
        )}
        <CopyIconButton value={value} label={`Copy ${key.toUpperCase()}`} />
      </span>
    );
  };

  const rows = entries.map(([key, value]) => ({
    items: [{ term: key, description: describe(key, value), mono: true }],
  }));
  // Two columns on a wide window: header order runs down the left column, then the right.
  const split = Math.ceil(rows.length / 2);

  return (
    <div className="px-4 py-3">
      <h3 className="mb-2 text-xs font-medium text-fg-secondary">
        {'event_type' in delivery.metadata ? 'Message metadata' : 'Headers sent'}
      </h3>
      <div className="grid gap-x-8 gap-y-3.5 xl:grid-cols-2">
        <DescriptionList rows={rows.slice(0, split)} />
        {rows.length > split ? <DescriptionList rows={rows.slice(split)} /> : null}
      </div>
    </div>
  );
}
