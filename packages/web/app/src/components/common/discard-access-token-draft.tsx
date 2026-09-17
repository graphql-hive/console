import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';

type DiscardAccessTokenDraftProps = {
  open: boolean;
  onContinue: () => void;
  onDiscard: () => void;
};

export const DiscardAccessTokenDraft = ({
  open,
  onContinue,
  onDiscard,
}: DiscardAccessTokenDraftProps) => {
  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (!next) {
          onContinue();
        }
      }}
      title="Do you want to discard the access token?"
      description="If you discard now, any draft information will be lost."
      confirm={{ label: 'Discard draft token', variant: 'destructive', onClick: onDiscard }}
      cancel={{ label: 'Continue creating token' }}
    />
  );
};
