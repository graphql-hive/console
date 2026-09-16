import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ChannelsTable_AlertChannelFragmentFragment } from '@/gql/graphql';
import type { ColumnDef } from '@tanstack/react-table';

export const ChannelsTable_AlertChannelFragment = graphql(`
  fragment ChannelsTable_AlertChannelFragment on AlertChannel {
    id
    name
    type
    ... on AlertSlackChannel {
      channel
    }
    ... on AlertWebhookChannel {
      endpoint
    }
    ... on TeamsWebhookChannel {
      endpoint
    }
    ... on DiscordWebhookChannel {
      endpoint
    }
  }
`);

function channelEndpoint(channel: ChannelsTable_AlertChannelFragmentFragment): string {
  if (channel.__typename === 'AlertSlackChannel') {
    return channel.channel;
  }
  if (
    channel.__typename === 'AlertWebhookChannel' ||
    channel.__typename === 'TeamsWebhookChannel' ||
    channel.__typename === 'DiscordWebhookChannel'
  ) {
    return channel.endpoint;
  }

  return '';
}

export function ChannelsTable(props: {
  channels: FragmentType<typeof ChannelsTable_AlertChannelFragment>[];
  isChecked: (channelId: string) => boolean;
  onCheckedChange: (channelId: string, checked: boolean) => void;
}) {
  const channels = useFragment(ChannelsTable_AlertChannelFragment, props.channels);

  const columns: ColumnDef<ChannelsTable_AlertChannelFragmentFragment, unknown>[] = [
    {
      id: 'select',
      meta: { width: 'xs' },
      cell: ({ row }) => (
        <DataTableCell
          kind="checkbox"
          checked={props.isChecked(row.original.id)}
          onCheckedChange={checked => props.onCheckedChange(row.original.id, checked)}
          label={`Select ${row.original.name}`}
        />
      ),
    },
    {
      id: 'name',
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.name} weight="medium" />,
    },
    {
      id: 'endpoint',
      meta: { width: 'fill' },
      cell: ({ row }) => (
        <DataTableCell kind="text" value={channelEndpoint(row.original)} tone="muted" truncate />
      ),
    },
    {
      id: 'type',
      cell: ({ row }) => (
        <DataTableCell kind="badge" items={{ content: row.original.type, variant: 'secondary' }} />
      ),
    },
  ];

  return (
    <DataTable
      data={[...channels]}
      columns={columns}
      getRowId={channel => channel.id}
      pagination={{ kind: 'none' }}
      emptyMessage="No channels yet."
    />
  );
}
