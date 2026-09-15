import { Badge } from '@/components/base/badge/badge';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Table, TBody, Td, Tr } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ChannelsTable_AlertChannelFragmentFragment } from '@/gql/graphql';

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

export function ChannelsTable(props: {
  channels: FragmentType<typeof ChannelsTable_AlertChannelFragment>[];
  isChecked: (channelId: string) => boolean;
  onCheckedChange: (channelId: string, checked: boolean) => void;
}) {
  const channels = useFragment(ChannelsTable_AlertChannelFragment, props.channels);

  const renderChannelEndpoint = (channel: ChannelsTable_AlertChannelFragmentFragment) => {
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
  };

  return (
    <Table>
      <TBody>
        {channels.map(channel => (
          <Tr key={channel.id}>
            <Td width="1">
              <Checkbox
                onCheckedChange={isChecked => {
                  props.onCheckedChange(channel.id, isChecked === true);
                }}
                checked={props.isChecked(channel.id)}
              />
            </Td>
            <Td className="text-ellipsis whitespace-nowrap">{channel.name}</Td>
            <Td className="text-neutral-10 max-w-xs truncate text-xs">
              {renderChannelEndpoint(channel)}
            </Td>
            <Td className="flex max-w-24 content-end">
              <Badge content={channel.type} variants={{ variant: 'secondary' }} />
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
