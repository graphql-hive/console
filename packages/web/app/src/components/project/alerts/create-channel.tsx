import { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/primitives/button/button';
import { Collapsible } from '@/components/ui/primitives/collapsible/collapsible';
import { Sheet } from '@/components/ui/primitives/overlays/sheet/sheet';
import { graphql } from '@/gql';
import { AlertChannelType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CHANNEL_FORM_ID,
  ChannelForm,
  ChannelFormSchema,
  isWebhookLike,
  type ChannelFormValues,
} from './channel-form';
import { SendChannelTest } from './send-channel-test';

export const CreateChannel_AddAlertChannelMutation = graphql(`
  mutation CreateChannel_AddAlertChannel($input: AddAlertChannelInput!) {
    addAlertChannel(input: $input) {
      ok {
        updatedProject {
          id
        }
        addedAlertChannel {
          ...ChannelsTable_AlertChannelFragment
        }
      }
      error {
        message
        inputErrors {
          webhookEndpoint
          slackChannel
          name
        }
      }
    }
  }
`);

export const CreateChannelSheet = ({
  isOpen,
  toggleOpen,
  onOpenChangeComplete,
}: {
  isOpen: boolean;
  toggleOpen: () => void;
  onOpenChangeComplete?: (open: boolean) => void;
}): ReactElement => {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const [mutation, mutate] = useMutation(CreateChannel_AddAlertChannelMutation);
  const form = useForm<ChannelFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(ChannelFormSchema),
    defaultValues: {
      name: '',
      type: '' as AlertChannelType,
      slackChannel: '',
      endpoint: '',
    },
    disabled: mutation.fetching,
  });

  async function onSubmit(values: ChannelFormValues) {
    const { data, error } = await mutate({
      input: {
        organizationSlug,
        projectSlug,
        name: values.name,
        type: values.type,
        slack: values.type === AlertChannelType.Slack ? { channel: values.slackChannel } : null,
        webhook: isWebhookLike(values.type) ? { endpoint: values.endpoint } : null,
      },
    });
    if (error) {
      console.error(error);
    }
    if (data?.addAlertChannel.error) {
      console.error(data.addAlertChannel.error);
      const { inputErrors } = data.addAlertChannel.error;
      if (inputErrors.name) {
        form.setError('name', { message: inputErrors.name });
      }
      if (inputErrors.webhookEndpoint) {
        form.setError('endpoint', { message: inputErrors.webhookEndpoint });
      }
      if (inputErrors.slackChannel) {
        form.setError('slackChannel', { message: inputErrors.slackChannel });
      }
    }
    if (data?.addAlertChannel.ok) {
      toggleOpen();
    }
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={toggleOpen}
      onOpenChangeComplete={onOpenChangeComplete}
      title="Create a channel"
      footer={
        <>
          <Button onSurface="raised" type="button" variant="outline" onClick={toggleOpen}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={CHANNEL_FORM_ID}
            onSurface="raised"
            disabled={form.formState.isSubmitting}
          >
            Create Channel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ChannelForm form={form} onSubmit={onSubmit} />
        <Collapsible trigger="Advanced">
          <div className="px-2 pt-2 pb-1">
            <SendChannelTest channelId={null} form={form} disabled={mutation.fetching} />
          </div>
        </Collapsible>
      </div>
    </Sheet>
  );
};
