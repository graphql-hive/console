import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useMutation } from 'urql';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Button } from '@/components/ui/primitives/button/button';
import { Collapsible } from '@/components/ui/primitives/collapsible/collapsible';
import { labelVariants } from '@/components/ui/primitives/label/label';
import { Sheet } from '@/components/ui/primitives/overlays/sheet/sheet';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { controlSurface } from '@/components/ui/primitives/shared-styles';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';
import { AlertChannelType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
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

export const EditChannelSheet_TestDeliveryChannelMutation = graphql(`
  mutation EditChannelSheet_TestDeliveryChannel($input: TestDeliveryChannelInput!) {
    testDeliveryChannel(input: $input) {
      ok {
        idempotencyKey
      }
      error {
        message
        idempotencyKey
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
      description="Rename the channel or point it at a new destination. The type cannot change."
      footer={
        <>
          <Button onSurface="raised" type="button" variant="outline" onClick={() => setOpen(false)}>
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
      <div className="flex flex-col gap-5">
        <ChannelForm form={form} onSubmit={onSubmit} typeDisabled />
        <Collapsible trigger="Advanced">
          <div className="px-2 pt-2 pb-1">
            <SendChannelTest channel={channel} form={form} disabled={mutation.fetching} />
          </div>
        </Collapsible>
      </div>
    </Sheet>
  );
}

type TestOutcome = {
  delivered: boolean;
  message: string | null;
  idempotencyKey: string | null;
};

function SendChannelTest(props: {
  channel: EditableChannel;
  form: UseFormReturn<ChannelFormValues>;
  disabled: boolean;
}) {
  const [mutation, mutate] = useMutation(EditChannelSheet_TestDeliveryChannelMutation);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const isSlack = props.channel.type === AlertChannelType.Slack;

  async function sendTest() {
    setOutcome(null);
    const field = isSlack ? 'slackChannel' : 'endpoint';
    if (!(await props.form.trigger(field))) {
      return;
    }
    const destination = props.form.getValues(field);
    const { data, error } = await mutate({
      input: {
        channelId: props.channel.id,
        destination: isSlack
          ? { slack: { channel: destination } }
          : { webhook: { endpoint: destination } },
      },
    });
    const result = data?.testDeliveryChannel;
    if (result?.ok) {
      setOutcome({
        delivered: true,
        message: null,
        idempotencyKey: result.ok.idempotencyKey ?? null,
      });
      return;
    }
    setOutcome({
      delivered: false,
      message: result?.error?.message ?? error?.message ?? 'Unexpected error',
      idempotencyKey: result?.error?.idempotencyKey ?? null,
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-fg-default">
        Verify your configuration with a test event sent from Hive using the configuration above.
      </p>
      <div className="py-2">
        <Button
          type="button"
          onSurface="raised"
          disabled={props.disabled || mutation.fetching}
          onClick={() => void sendTest()}
        >
          Test configuration
        </Button>
      </div>
      <div
        className={cn('flex h-32 w-full flex-col rounded-md border', controlSurface.raised)}
        aria-live="polite"
      >
        {mutation.fetching ? (
          <div className="flex grow items-center justify-center">
            <Spinner label="Testing configuration" />
          </div>
        ) : outcome ? (
          <ScrollArea axis="both" fill>
            <div className="flex flex-col gap-4 p-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className={labelVariants({ variant: 'caps' })}>Status</span>
                {outcome.delivered ? (
                  <p>Success</p>
                ) : (
                  <p className="text-critical">Failed: {outcome.message}</p>
                )}
              </div>
              {outcome.idempotencyKey ? (
                <div className="flex flex-col">
                  <span className={labelVariants({ variant: 'caps' })}>Idempotency key</span>
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-xs whitespace-nowrap">
                      {outcome.idempotencyKey}
                    </code>
                    <CopyIconButton label="Copy idempotency key" value={outcome.idempotencyKey} />
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        ) : (
          <p className="flex grow items-center justify-center text-sm text-fg-subtle">
            No test results yet.
          </p>
        )}
      </div>
    </div>
  );
}
