import { useMutation } from 'urql';
import { Callout } from '@/components/ui/callout';
import { Button } from '@/components/ui/primitives/button/button';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { CHANNEL_DISABLE_GRACE_HOURS } from './channel-health-warning';

// The health comes back too, so the details panel's status follows from the cache at once.
const ChannelDisabledNotice_EnableAlertChannelMutation = graphql(`
  mutation ChannelDisabledNotice_EnableAlertChannel($input: EnableAlertChannelInput!) {
    enableAlertChannel(input: $input) {
      ok {
        enabledAlertChannel {
          id
          disabledAt
          disabledBy {
            id
            displayName
          }
          deliveryHealth {
            status
            failingSince
          }
        }
      }
      error {
        message
      }
    }
  }
`);

/** Why Hive stopped sending to the channel, and the way out of it. */
export function ChannelDisabledNotice(props: { channelId: string; disabledAt: string }) {
  const [mutation, mutate] = useMutation(ChannelDisabledNotice_EnableAlertChannelMutation);
  const { toast } = useToast();

  return (
    <Callout type="warning" className="mt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>
            Hive disabled this channel <TimeAgo date={props.disabledAt} /> because it had been
            failing for {CHANNEL_DISABLE_GRACE_HOURS} hours.
          </p>
          <p>No notifications will be sent until this is enabled again.</p>
        </div>
        <Button
          label="Enable channel"
          disabled={mutation.fetching}
          onClick={() =>
            void mutate({ input: { channelId: props.channelId } }).then(result => {
              const message =
                result.error?.message ?? result.data?.enableAlertChannel.error?.message;
              if (message) {
                toast({
                  variant: 'destructive',
                  title: 'Failed to enable channel.',
                  description: message,
                });
                return;
              }
              toast({ title: 'Channel enabled.' });
            })
          }
        />
      </div>
    </Callout>
  );
}
