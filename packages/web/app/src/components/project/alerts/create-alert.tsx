import { ReactElement, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Button } from '@/components/base/button/button';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { FragmentType, graphql, useFragment } from '@/gql';
import { AlertType } from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { ALERT_FORM_ID, AlertForm, alertFormSchema, type AlertFormValues } from './alert-form';

export const CreateAlertModal_AddAlertMutation = graphql(`
  mutation CreateAlertModal_AddAlertMutation($input: AddAlertInput!) {
    addAlert(input: $input) {
      ok {
        updatedProject {
          id
        }
        addedAlert {
          ...AlertsTable_AlertFragment
        }
      }
      error {
        message
      }
    }
  }
`);

export const CreateAlertModal_TargetFragment = graphql(`
  fragment CreateAlertModal_TargetFragment on Target {
    id
    slug
  }
`);

export const CreateAlertModal_AlertChannelFragment = graphql(`
  fragment CreateAlertModal_AlertChannelFragment on AlertChannel {
    id
    name
  }
`);

export const CreateAlertModal = (props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  onOpenChangeComplete?: (open: boolean) => void;
  targets: FragmentType<typeof CreateAlertModal_TargetFragment>[];
  channels: FragmentType<typeof CreateAlertModal_AlertChannelFragment>[];
  organizationSlug: string;
  projectSlug: string;
}): ReactElement => {
  const { isOpen, toggleModalOpen } = props;
  const targets = useFragment(CreateAlertModal_TargetFragment, props.targets);
  const channels = useFragment(CreateAlertModal_AlertChannelFragment, props.channels);
  const [mutation, mutate] = useMutation(CreateAlertModal_AddAlertMutation);

  const schema = useMemo(
    () =>
      alertFormSchema({
        channelIds: channels.map(channel => channel.id),
        targetSlugs: targets.map(target => target.slug),
      }),
    [channels, targets],
  );
  const form = useForm<AlertFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(schema),
    defaultValues: {
      type: AlertType.SchemaChangeNotifications,
      channel: '',
      target: '',
    },
    disabled: mutation.fetching,
  });

  async function onSubmit(values: AlertFormValues) {
    const { error, data } = await mutate({
      input: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: values.target,
        channelId: values.channel,
        type: values.type,
      },
    });
    if (!error && data?.addAlert) {
      toggleModalOpen();
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={toggleModalOpen}
      onOpenChangeComplete={props.onOpenChangeComplete}
      title="Create an alert"
      footer={
        <>
          <Button type="button" variant="outline" onClick={toggleModalOpen}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={ALERT_FORM_ID}
            onSurface="raised"
            disabled={form.formState.isSubmitting}
          >
            Create Alert
          </Button>
        </>
      }
    >
      <AlertForm
        form={form}
        onSubmit={onSubmit}
        channels={channels}
        targets={targets}
        error={mutation.error?.message}
      />
    </Dialog>
  );
};
