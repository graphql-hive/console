import { useMutation } from 'urql';
import { Switch } from '@/components/ui/primitives/switch/switch';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';

// Both answers carry what the page shows about the state, so the cache updates the header, the
// panel and the notice at once.
const ChannelEnabledToggle_EnableAlertChannelMutation = graphql(`
  mutation ChannelEnabledToggle_EnableAlertChannel($input: EnableAlertChannelInput!) {
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

const ChannelEnabledToggle_DisableAlertChannelMutation = graphql(`
  mutation ChannelEnabledToggle_DisableAlertChannel($input: DisableAlertChannelInput!) {
    disableAlertChannel(input: $input) {
      ok {
        disabledAlertChannel {
          id
          disabledAt
          disabledBy {
            id
            displayName
          }
        }
      }
      error {
        message
      }
    }
  }
`);

/** Pauses or resumes a channel's notifications. */
export function ChannelEnabledToggle(props: { channelId: string; enabled: boolean }) {
  const [, enable] = useMutation(ChannelEnabledToggle_EnableAlertChannelMutation);
  const [, disable] = useMutation(ChannelEnabledToggle_DisableAlertChannelMutation);
  const { toast } = useToast();

  return (
    <Switch
      checked={props.enabled}
      aria-label={props.enabled ? 'Disable channel' : 'Enable channel'}
      onCheckedChange={checked => {
        const input = { channelId: props.channelId };
        const refusal = checked
          ? enable({ input }).then(
              result => result.error?.message ?? result.data?.enableAlertChannel.error?.message,
            )
          : disable({ input }).then(
              result => result.error?.message ?? result.data?.disableAlertChannel.error?.message,
            );
        void refusal.then(message => {
          if (message) {
            toast({
              variant: 'destructive',
              title: checked ? 'Enable channel failed.' : 'Disable channel failed.',
              description: message,
            });
          }
        });
      }}
    />
  );
}
