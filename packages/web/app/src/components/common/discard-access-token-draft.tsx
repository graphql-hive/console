import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type DiscardAccessTokenDraftProps = {
  continueFn: () => void;
  discardFn: () => void;
};

export const DiscardAccessTokenDraft = ({
  continueFn,
  discardFn,
}: DiscardAccessTokenDraftProps) => {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Do you want to discard the access token?</AlertDialogTitle>
          <AlertDialogDescription>
            If you discard now, any draft information will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => continueFn()}>
            Continue creating token
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => discardFn()}>Discard draft token</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
