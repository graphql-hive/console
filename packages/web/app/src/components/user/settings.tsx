import { ReactElement } from 'react';
import { useFormik } from 'formik';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import { Input } from '@/components/base/input/input';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { graphql } from '@/gql';
import { Button } from '../ui/button';

const UserSettings_MeQuery = graphql(`
  query UserSettings_MeQuery {
    me {
      id
      fullName
      displayName
      canSwitchOrganization
    }
  }
`);

const UpdateMeMutation = graphql(`
  mutation updateMe($input: UpdateMeInput!) {
    updateMe(input: $input) {
      ok {
        updatedUser {
          id
          fullName
          displayName
        }
      }
      error {
        message
        inputErrors {
          fullName
          displayName
        }
      }
    }
  }
`);

export function UserSettingsModal({
  isOpen,
  toggleModalOpen,
  onOpenChangeComplete,
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  onOpenChangeComplete?: (open: boolean) => void;
}): ReactElement {
  const [meQuery] = useQuery({ query: UserSettings_MeQuery, pause: !isOpen });
  const [mutation, mutate] = useMutation(UpdateMeMutation);
  const { toast } = useToast();

  const me = meQuery.data?.me;

  const { handleSubmit, values, handleChange, handleBlur, isSubmitting, errors, touched } =
    useFormik({
      enableReinitialize: true,
      initialValues: {
        fullName: me?.fullName || '',
        displayName: me?.displayName || '',
      },
      validationSchema: Yup.object().shape({
        fullName: Yup.string().required('Full name is required'),
        displayName: Yup.string().required('Display name is required'),
      }),
      onSubmit: async values => {
        const { data } = await mutate({ input: values });
        if (data?.updateMe.ok) {
          toggleModalOpen();
          toast({
            variant: 'default',
            title: 'Profile updated',
            description: 'Your profile has been updated successfully',
          });
        }
        if (data?.updateMe.error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: data.updateMe.error.message,
          });
        }
      },
    });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={toggleModalOpen}
      onOpenChangeComplete={onOpenChangeComplete}
      title="Profile settings"
      footer={
        <Button type="submit" form="user-settings-form" disabled={isSubmitting}>
          Save Changes
        </Button>
      }
    >
      <form id="user-settings-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="fullName">
            Full name
          </label>
          <Input
            id="fullName"
            placeholder="Full name"
            name="fullName"
            value={values.fullName}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            invalid={touched.fullName && !!errors.fullName}
            onSurface="raised"
          />
          {touched.fullName && errors.fullName && (
            <span className="text-sm text-red-500">{errors.fullName}</span>
          )}
          {mutation.data?.updateMe.error?.inputErrors.fullName && (
            <span className="text-sm text-red-500">
              {mutation.data.updateMe.error.inputErrors.fullName}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="displayName">
            Display name
          </label>
          <Input
            id="displayName"
            placeholder="Display name"
            name="displayName"
            value={values.displayName}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            invalid={touched.displayName && !!errors.displayName}
            onSurface="raised"
          />
          {touched.displayName && errors.displayName && (
            <span className="text-sm text-red-500">{errors.displayName}</span>
          )}
          {mutation.data?.updateMe.error?.inputErrors.displayName && (
            <span className="text-sm text-red-500">
              {mutation.data.updateMe.error.inputErrors.displayName}
            </span>
          )}
        </div>

        {mutation.error && <span className="text-sm text-red-500">{mutation.error.message}</span>}
        {mutation.data?.updateMe.error?.message && (
          <span className="text-sm text-red-500">{mutation.data.updateMe.error.message}</span>
        )}
      </form>
    </Dialog>
  );
}
