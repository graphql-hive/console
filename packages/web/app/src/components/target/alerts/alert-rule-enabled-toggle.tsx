import { useMutation } from 'urql';
import { Switch } from '@/components/base/switch/switch';
import { useToast } from '@/components/base/toast/toast';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';

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

export function AlertRuleEnabledToggle(props: { ruleId: string; enabled: boolean }) {
  const { organizationSlug, projectSlug } = useSlugs('target');
  const [, mutate] = useMutation(AlertRuleEnabledToggle_Mutation);
  const { toast } = useToast();

  return (
    <Switch
      checked={props.enabled}
      aria-label={props.enabled ? 'Disable alert rule' : 'Enable alert rule'}
      onCheckedChange={checked =>
        void mutate({
          input: {
            project: {
              bySelector: {
                organizationSlug,
                projectSlug,
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
