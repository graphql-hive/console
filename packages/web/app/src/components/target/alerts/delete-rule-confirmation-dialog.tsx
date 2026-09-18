import { useMutation } from 'urql';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
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
  open: boolean;
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
    <AlertDialog
      open={props.open}
      onOpenChange={next => {
        if (!next && !mutationState.fetching) {
          props.onCancel();
        }
      }}
      title="Delete this alert rule?"
      description={
        <>
          This will permanently delete{' '}
          <span className="text-neutral-12 font-medium">{props.ruleName}</span>, its incident
          history, and state-log entries. This cannot be undone.
        </>
      }
      confirm={{
        label: 'Delete rule',
        variant: 'destructive',
        disabled: mutationState.fetching,
        onClick: () => {
          void mutate({
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
          });
        },
      }}
      cancel={{ disabled: mutationState.fetching }}
    />
  );
}
