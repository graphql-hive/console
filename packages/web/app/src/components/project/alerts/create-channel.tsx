import { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { Button } from '@/components/base/button/button';
import { graphql } from '@/gql';
import { AlertChannelType } from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CHANNEL_FORM_ID,
  ChannelForm,
  ChannelFormSchema,
  isWebhookLike,
  type ChannelFormValues,
} from './channel-form';

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

export const CreateChannelModal = ({
  isOpen,
  toggleModalOpen,
  onOpenChangeComplete,
  organizationSlug,
  projectSlug,
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  onOpenChangeComplete?: (open: boolean) => void;
  organizationSlug: string;
  projectSlug: string;
}): ReactElement => {
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
      toggleModalOpen();
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={toggleModalOpen}
      onOpenChangeComplete={onOpenChangeComplete}
      title="Create a channel"
      footer={
        <>
          <Button type="button" variant="outline" onClick={toggleModalOpen}>
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
      <ChannelForm form={form} onSubmit={onSubmit} />
    </Dialog>
  );
};
