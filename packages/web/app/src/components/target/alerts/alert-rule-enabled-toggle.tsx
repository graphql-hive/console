import { useMutation } from 'urql';
import { Switch } from '@/components/base/switch/switch';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';

const AlertRuleEnabledToggle_Mutation = graphql(`
  mutation AlertRuleEnabledToggle_Mutation($input: UpdateMetricAlertRuleInput!) {
    updateMetricAlertRule(input: $input) {
      ok {
        updatedMetricAlertRule {
          id
          enabled
          updatedAt
        }
      }
      error {
        message
      }
    }
  }
`);

export function AlertRuleEnabledToggle(props: {
  ruleId: string;
  enabled: boolean;
  organizationSlug: string;
  projectSlug: string;
  className?: string;
}) {
  const [, mutate] = useMutation(AlertRuleEnabledToggle_Mutation);
  const { toast } = useToast();

  return (
    <Switch
      className={props.className}
      checked={props.enabled}
      aria-label={props.enabled ? 'Disable alert rule' : 'Enable alert rule'}
      onClick={e => e.stopPropagation()}
      onCheckedChange={checked =>
        void mutate({
          input: {
            project: {
              bySelector: {
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
              },
            },
            ruleId: props.ruleId,
            enabled: checked,
          },
        }).then(result => {
          const message =
            result.error?.message ?? result.data?.updateMetricAlertRule.error?.message;
          if (message) {
            toast({
              variant: 'destructive',
              title: checked ? 'Enable alert rule failed.' : 'Disable alert rule failed.',
              description: message,
            });
          }
        })
      }
    />
  );
}
