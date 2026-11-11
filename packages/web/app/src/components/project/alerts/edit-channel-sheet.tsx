import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/primitives/button/button';
import { Sheet } from '@/components/ui/primitives/overlays/sheet/sheet';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';
import { AlertChannelType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CHANNEL_FORM_ID,
  ChannelForm,
  ChannelFormSchema,
  type ChannelFormValues,
} from './channel-form';

// The edited channel comes back with the details panel's fragment, so the page and the panel pick
// the new values up from the cache without a refetch.
export const EditChannelSheet_UpdateAlertChannelMutation = graphql(`
  mutation EditChannelSheet_UpdateAlertChannel($input: UpdateAlertChannelInput!) {
    updateAlertChannel(input: $input) {
      ok {
        updatedAlertChannel {
          ...ChannelDetailsPanel_AlertChannelFragment
        }
      }
      error {
        message
        inputErrors {
          name
          webhookEndpoint
          slackChannel
        }
      }
    }
  }
`);

export type EditableChannel = {
  id: string;
  name: string;
  type: AlertChannelType;
  /** The Slack channel name or the webhook endpoint. */
  destination: string;
};

/** The "Edit channel" button on the channel page and the sheet it opens. */
export function EditChannelSheet({ channel }: { channel: EditableChannel }) {
  // Remounted once the sheet has closed, so the next edit starts from the channel as it is then.
  const [session, setSession] = useState(0);
  return (
    <EditChannelSheetSession
      key={session}
      channel={channel}
      onClosed={() => setSession(current => current + 1)}
    />
  );
}

function EditChannelSheetSession({
  channel,
  onClosed,
}: {
  channel: EditableChannel;
  onClosed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { organizationSlug, projectSlug } = useSlugs('project');
  const { toast } = useToast();
  const [mutation, mutate] = useMutation(EditChannelSheet_UpdateAlertChannelMutation);
  const isSlack = channel.type === AlertChannelType.Slack;
  const form = useForm<ChannelFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(ChannelFormSchema),
    defaultValues: {
      name: channel.name,
      type: channel.type,
      slackChannel: isSlack ? channel.destination : '',
      endpoint: isSlack ? '' : channel.destination,
    },
    disabled: mutation.fetching,
  });

  async function onSubmit(values: ChannelFormValues) {
    const destination = isSlack ? values.slackChannel : values.endpoint;
    const nameChanged = values.name !== channel.name;
    const destinationChanged = destination !== channel.destination;
    if (!nameChanged && !destinationChanged) {
      setOpen(false);
      return;
    }

    // Only what changed is sent; a changed destination is the one thing that triggers a
    // confirmation message, so an unchanged one must not look changed.
    const { data, error } = await mutate({
      input: {
        organizationSlug,
        projectSlug,
        channelId: channel.id,
        name: nameChanged ? values.name : null,
        slack: isSlack && destinationChanged ? { channel: values.slackChannel } : null,
        webhook: !isSlack && destinationChanged ? { endpoint: values.endpoint } : null,
      },
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update channel.',
        description: error.message,
      });
      return;
    }
    if (data?.updateAlertChannel.error) {
      const { message, inputErrors } = data.updateAlertChannel.error;
      if (inputErrors.name) {
        form.setError('name', { message: inputErrors.name });
      }
      if (inputErrors.webhookEndpoint) {
        form.setError('endpoint', { message: inputErrors.webhookEndpoint });
      }
      if (inputErrors.slackChannel) {
        form.setError('slackChannel', { message: inputErrors.slackChannel });
      }
      if (!inputErrors.name && !inputErrors.webhookEndpoint && !inputErrors.slackChannel) {
        toast({ variant: 'destructive', title: 'Failed to update channel.', description: message });
      }
      return;
    }
    if (data?.updateAlertChannel.ok) {
      toast({ title: 'Channel updated.' });
      setOpen(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={isOpen => {
        if (!isOpen) {
          onClosed();
        }
      }}
      trigger={<Button variant="outline" label="Edit channel" />}
      title="Edit channel"
      description="Rename the channel or point it at a new destination, which receives a confirmation message. The type cannot change."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={CHANNEL_FORM_ID}
            onSurface="raised"
            disabled={form.formState.isSubmitting}
          >
            Save changes
          </Button>
        </>
      }
    >
      <ChannelForm form={form} onSubmit={onSubmit} typeDisabled />
    </Sheet>
  );
}
