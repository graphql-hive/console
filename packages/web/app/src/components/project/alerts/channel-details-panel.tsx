import { useState } from 'react';
import { Button } from '@/components/ui/primitives/button/button';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';
import { StatusDot } from '@/components/ui/primitives/status-dot/status-dot';
import { TimeAgo } from '@/components/ui/time-ago';
import { DocumentType, FragmentType, graphql, useFragment } from '@/gql';
import { AlertChannelType, DeliveryHealthStatus } from '@/gql/graphql';
import { ChannelEnabledToggle } from './channel-enabled-toggle';
import { CHANNEL_TYPE_LABEL } from './channel-form';
import { DeleteChannelConfirmationDialog } from './delete-channel-confirmation-dialog';

export const ChannelDetailsPanel_AlertChannelFragment = graphql(`
  fragment ChannelDetailsPanel_AlertChannelFragment on AlertChannel {
    id
    name
    type
    disabledAt
    deliveryHealth {
      status
      failingSince
    }
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

type ChannelDetails = DocumentType<typeof ChannelDetailsPanel_AlertChannelFragment>;

/** Where the channel delivers: the Slack channel name or the webhook endpoint. */
export function channelDestination(channel: ChannelDetails): string {
  switch (channel.__typename) {
    case 'AlertSlackChannel':
      return channel.channel;
    case 'AlertWebhookChannel':
    case 'TeamsWebhookChannel':
    case 'DiscordWebhookChannel':
      return channel.endpoint;
    default:
      return '';
  }
}

export function ChannelDetailsPanel(props: {
  channel: FragmentType<typeof ChannelDetailsPanel_AlertChannelFragment>;
  onChannelDeleted: () => void;
}) {
  const channel = useFragment(ChannelDetailsPanel_AlertChannelFragment, props.channel);
  const isSlack = channel.type === AlertChannelType.Slack;

  return (
    <div className="space-y-6 border-l border-line bg-surface-card px-5 py-3">
      <h2 className="mb-2 block text-sm font-semibold text-fg">Channel details</h2>

      <DescriptionList
        rows={[
          {
            items: [
              {
                term: 'Status',
                description: (
                  <ChannelStatus health={channel.deliveryHealth} disabledAt={channel.disabledAt} />
                ),
              },
            ],
          },
          { items: [{ term: 'Type', description: CHANNEL_TYPE_LABEL[channel.type] }] },
          {
            items: [
              {
                term: isSlack ? 'Slack channel' : 'Endpoint',
                description: channelDestination(channel),
                mono: true,
                copyable: true,
              },
            ],
          },
          { items: [{ term: 'ID', description: channel.id, mono: true, copyable: true }] },
        ]}
      />

      <div className="flex items-center justify-between border-y border-line py-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-fg">Channel status</span>
          <span className="text-xs text-fg-secondary">
            {channel.disabledAt ? 'Paused (no notifications sending)' : 'Sending notifications'}
          </span>
        </span>
        <ChannelEnabledToggle channelId={channel.id} enabled={!channel.disabledAt} />
      </div>

      <div className="flex items-center gap-2">
        <DeleteChannelButton
          channelId={channel.id}
          channelName={channel.name}
          onDeleted={props.onChannelDeleted}
        />
      </div>
    </div>
  );
}

const STATUS_PRESENTATION = {
  [DeliveryHealthStatus.Healthy]: { color: 'success', label: 'Healthy' },
  [DeliveryHealthStatus.Failing]: { color: 'critical', label: 'Failing' },
  [DeliveryHealthStatus.Unknown]: { color: 'neutral', label: 'No data' },
} as const;

/**
 * Disabled by Hive, or else the channel's delivery status; a null health means the delivery
 * history could not be read.
 */
function ChannelStatus({
  health,
  disabledAt,
}: {
  health: { status: DeliveryHealthStatus; failingSince?: string | null } | null;
  disabledAt: string | null;
}) {
  // Paused rather than broken: the dot stays neutral, and the page's notice tells when.
  if (disabledAt) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <StatusDot color="neutral" />
        <span>Paused</span>
      </span>
    );
  }
  if (!health) {
    return <span className="text-fg-subtle">Unavailable</span>;
  }

  const { color, label } = STATUS_PRESENTATION[health.status];
  const failingSince = health.status === DeliveryHealthStatus.Failing ? health.failingSince : null;

  return (
    <span className="inline-flex items-center gap-0.5">
      <StatusDot color={color} />
      <span>
        {label}
        {failingSince ? (
          <>
            {' since '}
            <TimeAgo date={failingSince} />
          </>
        ) : null}
      </span>
    </span>
  );
}

function DeleteChannelButton({
  channelId,
  channelName,
  onDeleted,
}: {
  channelId: string;
  channelName: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" label="Delete channel" onClick={() => setOpen(true)} />
      <DeleteChannelConfirmationDialog
        open={open}
        channelId={channelId}
        channelName={channelName}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onDeleted();
        }}
      />
    </>
  );
}
