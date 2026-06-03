import { useMutation } from 'urql';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';

const DeleteRuleConfirmationDialog_Mutation = graphql(`
  mutation DeleteRuleConfirmationDialog_Mutation($input: DeleteMetricAlertRulesInput!) {
    deleteMetricAlertRules(input: $input) {
      error {
        message
      }
      ok {
        deletedMetricAlertRuleIds
      }
    }
  }
`);

type DeleteRuleConfirmationDialogProps = {
  ruleId: string;
  ruleName: string;
  organizationSlug: string;
  projectSlug: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteRuleConfirmationDialog(props: DeleteRuleConfirmationDialogProps) {
  const [mutationState, mutate] = useMutation(DeleteRuleConfirmationDialog_Mutation);
  const { toast } = useToast();

  return (
    <AlertDialog.AlertDialog open>
      <AlertDialog.AlertDialogContent>
        <AlertDialog.AlertDialogHeader>
          <AlertDialog.AlertDialogTitle>Delete this alert rule?</AlertDialog.AlertDialogTitle>
          <AlertDialog.AlertDialogDescription>
            This will permanently delete{' '}
            <span className="text-neutral-12 font-medium">{props.ruleName}</span>, its incident
            history, and state-log entries. This cannot be undone.
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
                  project: {
                    bySelector: {
                      organizationSlug: props.organizationSlug,
                      projectSlug: props.projectSlug,
                    },
                  },
                  ruleIds: [props.ruleId],
                },
              }).then(result => {
                if (result.error) {
                  toast({
                    variant: 'destructive',
                    title: 'Delete alert rule failed.',
                    description: result.error.message,
                  });
                  return;
                }
                if (result.data?.deleteMetricAlertRules.error) {
                  toast({
                    variant: 'destructive',
                    title: 'Delete alert rule failed.',
                    description: result.data.deleteMetricAlertRules.error.message,
                  });
                  return;
                }
                if (result.data?.deleteMetricAlertRules.ok) {
                  toast({ variant: 'default', title: 'Alert rule deleted.' });
                  props.onConfirm();
                }
              })
            }
          >
            Delete rule
          </AlertDialog.AlertDialogAction>
        </AlertDialog.AlertDialogFooter>
      </AlertDialog.AlertDialogContent>
    </AlertDialog.AlertDialog>
  );
}
