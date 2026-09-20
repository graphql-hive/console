import { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { graphql } from '@/gql';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/base/button/button';
import {
  USER_SETTINGS_FORM_ID,
  UserSettingsForm,
  UserSettingsFormSchema,
  type UserSettingsFormValues,
} from './user-settings-form';

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

  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(UserSettingsFormSchema),
    // Follows the query, so the fields fill in once the profile arrives.
    values: {
      fullName: me?.fullName || '',
      displayName: me?.displayName || '',
    },
    disabled: mutation.fetching,
  });

  async function onSubmit(values: UserSettingsFormValues) {
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
      const { inputErrors } = data.updateMe.error;
      if (inputErrors.fullName) {
        form.setError('fullName', { message: inputErrors.fullName });
      }
      if (inputErrors.displayName) {
        form.setError('displayName', { message: inputErrors.displayName });
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: data.updateMe.error.message,
      });
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={toggleModalOpen}
      onOpenChangeComplete={onOpenChangeComplete}
      title="Profile settings"
      footer={
        <Button
          type="submit"
          form={USER_SETTINGS_FORM_ID}
          onSurface="raised"
          disabled={form.formState.isSubmitting}
        >
          Save Changes
        </Button>
      }
    >
      <UserSettingsForm
        form={form}
        onSubmit={onSubmit}
        error={mutation.error?.message ?? mutation.data?.updateMe.error?.message}
      />
    </Dialog>
  );
}
