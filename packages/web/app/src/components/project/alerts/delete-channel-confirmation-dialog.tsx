import { useMutation } from 'urql';
import { AlertDialog } from '@/components/ui/primitives/overlays/alert-dialog/alert-dialog';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { useSlugs } from '@/lib/hooks';
import { DeleteChannelsButton_DeleteChannelsMutation } from './delete-channels-button';

type DeleteChannelConfirmationDialogProps = {
  open: boolean;
  channelId: string;
  channelName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteChannelConfirmationDialog(props: DeleteChannelConfirmationDialogProps) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const [mutationState, mutate] = useMutation(DeleteChannelsButton_DeleteChannelsMutation);
  const { toast } = useToast();

  return (
    <AlertDialog
      open={props.open}
      onOpenChange={next => {
        if (!next && !mutationState.fetching) {
          props.onCancel();
        }
      }}
      title="Delete this channel?"
      description={
        <>
          This will permanently delete{' '}
          <span className="font-medium text-fg">{props.channelName}</span>. Alerts that deliver to
          it will stop. This cannot be undone.
        </>
      }
      confirm={{
        label: 'Delete channel',
        variant: 'destructive',
        disabled: mutationState.fetching,
        onClick: () => {
          void mutate({
            input: { organizationSlug, projectSlug, channelIds: [props.channelId] },
          }).then(result => {
            if (result.error) {
              toast({
                variant: 'destructive',
                title: 'Delete channel failed.',
                description: result.error.message,
              });
              return;
            }
            if (result.data?.deleteAlertChannels.error) {
              toast({
                variant: 'destructive',
                title: 'Delete channel failed.',
                description: result.data.deleteAlertChannels.error.message,
              });
              return;
            }
            if (result.data?.deleteAlertChannels.ok) {
              toast({ variant: 'default', title: 'Channel deleted.' });
              props.onConfirm();
            }
          });
        },
      }}
      cancel={{ disabled: mutationState.fetching }}
    />
  );
}
