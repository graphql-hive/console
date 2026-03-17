import { useMutation } from 'urql';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';

const DeleteAccessTokenConfirmationDialogue_DeleteAccessToken = graphql(`
  mutation DeleteAccessTokenConfirmationDialogue_DeleteAccessToken(
    $input: DeleteAccessTokenInput!
  ) {
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

type DeleteAccessTokenConfirmationDialogueProps = {
  accessTokenId: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteAccessTokenConfirmationDialogue(
  props: DeleteAccessTokenConfirmationDialogueProps,
) {
  const [mutationState, mutate] = useMutation(
    DeleteAccessTokenConfirmationDialogue_DeleteAccessToken,
  );
  const { toast } = useToast();

  return (
    <AlertDialog.AlertDialog open>
      <AlertDialog.AlertDialogContent>
        <AlertDialog.AlertDialogHeader>
          <AlertDialog.AlertDialogTitle>
            Do you want to delete this access token?
          </AlertDialog.AlertDialogTitle>
          <AlertDialog.AlertDialogDescription>
            If you cancel now, any draft information will be lost.
          </AlertDialog.AlertDialogDescription>
        </AlertDialog.AlertDialogHeader>
        <AlertDialog.AlertDialogFooter>
          <AlertDialog.AlertDialogCancel
            onClick={mutationState.fetching ? undefined : props.onCancel}
            disabled={mutationState.fetching}
          >
            Cancel
          </AlertDialog.AlertDialogCancel>
          <AlertDialog.AlertDialogAction
            onClick={() =>
              mutate({
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
                    description: 'It can take up to 5 minutes for changes to propagate.',
                  });
                  props.onConfirm();
                }
              })
            }
          >
            Delete Access Token
          </AlertDialog.AlertDialogAction>
        </AlertDialog.AlertDialogFooter>
      </AlertDialog.AlertDialogContent>
    </AlertDialog.AlertDialog>
  );
}
