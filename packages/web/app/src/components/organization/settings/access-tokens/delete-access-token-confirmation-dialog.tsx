import { useMutation } from 'urql';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { useToast } from '@/components/base/toast/toast';
import { graphql } from '@/gql';

const DeleteAccessTokenConfirmationDialog_DeleteAccessToken = graphql(`
  mutation DeleteAccessTokenConfirmationDialog_DeleteAccessToken($input: DeleteAccessTokenInput!) {
    deleteAccessToken(input: $input) {
      error {
        message
      }
      ok {
        deletedAccessTokenId
      }
    }
  }
`);

type DeleteAccessTokenConfirmationDialogProps = {
  open: boolean;
  /** Null while closed. */
  accessTokenId: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteAccessTokenConfirmationDialog(
  props: DeleteAccessTokenConfirmationDialogProps,
) {
  const [mutationState, mutate] = useMutation(
    DeleteAccessTokenConfirmationDialog_DeleteAccessToken,
  );
  const { toast } = useToast();

  return (
    <AlertDialog
      open={props.open}
      onOpenChange={next => {
        if (!next && !mutationState.fetching) {
          props.onCancel();
        }
      }}
      title="Do you want to delete this access token?"
      description="Deleting will invalidate the access token within 5 minutes. Once deleted, this token cannot be recovered."
      confirm={{
        label: 'Delete Access Token',
        variant: 'destructive',
        disabled: mutationState.fetching,
        onClick: () => {
          if (!props.accessTokenId) {
            return;
          }
          void mutate({
            input: {
              accessToken: {
                byId: props.accessTokenId,
              },
            },
          }).then(result => {
            if (result.error) {
              toast({
                variant: 'destructive',
                title: 'Delete Access Token failed.',
                description: result.error.message,
              });
            }
            if (result.data?.deleteAccessToken.error) {
              toast({
                variant: 'destructive',
                title: 'Delete Access Token failed.',
                description: result.data.deleteAccessToken.error.message,
              });
            }
            if (result.data?.deleteAccessToken.ok) {
              toast({
                variant: 'default',
                title: 'Access Token deleted.',
              });
              props.onConfirm();
            }
          });
        },
      }}
      cancel={{ disabled: mutationState.fetching }}
    />
  );
}
