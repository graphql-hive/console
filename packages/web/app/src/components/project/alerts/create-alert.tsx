import { ReactElement } from 'react';
import { useFormik } from 'formik';
import { useMutation } from 'urql';
import * as Yup from 'yup';
import { Select } from '@/components/base/floating/select/select';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Modal } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { AlertType } from '@/gql/graphql';

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
  targets: FragmentType<typeof CreateAlertModal_TargetFragment>[];
  channels: FragmentType<typeof CreateAlertModal_AlertChannelFragment>[];
  organizationSlug: string;
  projectSlug: string;
}): ReactElement => {
  const { isOpen, toggleModalOpen } = props;
  const targets = useFragment(CreateAlertModal_TargetFragment, props.targets);
  const channels = useFragment(CreateAlertModal_AlertChannelFragment, props.channels);
  const [mutation, mutate] = useMutation(CreateAlertModal_AddAlertMutation);

  const { handleSubmit, values, setFieldValue, setFieldTouched, errors, touched, isSubmitting } =
    useFormik({
      initialValues: {
        type: AlertType.SchemaChangeNotifications,
        channel: '',
        target: '',
      },
      validationSchema: Yup.object().shape({
        type: Yup.string()
          .equals([AlertType.SchemaChangeNotifications])
          .required('Must select type'),
        channel: Yup.lazy(() =>
          Yup.string()
            .min(1)
            .equals(channels.map(channel => channel.id))
            .required('Must select channel'),
        ),
        target: Yup.lazy(() =>
          Yup.string()
            .min(1)
            .equals(targets.map(target => target.slug))
            .required('Must select target'),
        ),
      }),
      async onSubmit(values) {
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
      },
    });

  return (
    <Modal open={isOpen} onOpenChange={toggleModalOpen}>
      <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
        <Heading className="text-center">Create an alert</Heading>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="type">
            Type
          </label>
          <Select
            id="type"
            name="type"
            placeholder="Select alert type"
            options={[
              {
                value: AlertType.SchemaChangeNotifications,
                label: 'Schema Change Notifications',
              },
            ]}
            value={values.type}
            onValueChange={value => void setFieldValue('type', value)}
            onBlur={() => void setFieldTouched('type')}
            width="full"
          />
          {touched.type && errors.type && <div className="text-sm text-red-500">{errors.type}</div>}
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="channel">
            Channel
          </label>
          <Select
            id="channel"
            name="channel"
            placeholder="Select channel"
            options={channels.map(channel => ({
              value: channel.id,
              label: channel.name,
            }))}
            value={values.channel}
            onValueChange={value => void setFieldValue('channel', value)}
            onBlur={() => void setFieldTouched('channel')}
            width="full"
          />
          {touched.channel && errors.channel && (
            <div className="text-sm text-red-500">{errors.channel}</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="target">
            Target
          </label>
          <Select
            id="target"
            name="target"
            placeholder="Select target"
            options={targets.map(target => ({
              value: target.slug,
              label: target.slug,
            }))}
            value={values.target}
            onValueChange={value => void setFieldValue('target', value)}
            onBlur={() => void setFieldTouched('target')}
            width="full"
          />
          {touched.target && errors.target && (
            <div className="text-sm text-red-500">{errors.target}</div>
          )}
        </div>

        {mutation.error && <div className="text-sm text-red-500">{mutation.error.message}</div>}

        <div className="flex w-full gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full justify-center"
            onClick={toggleModalOpen}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            className="w-full justify-center"
            variant="primary"
            disabled={isSubmitting}
          >
            Create Alert
          </Button>
        </div>
      </form>
    </Modal>
  );
};
