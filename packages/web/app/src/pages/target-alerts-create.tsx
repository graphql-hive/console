import { CircleAlert } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import {
  AlertForm,
  DEFAULT_ALERT_FORM_VALUES,
  type AlertFormValues,
} from '@/components/target/alerts/alert-form';
import { graphql } from '@/gql';
import { useNavigate } from '@tanstack/react-router';

const TargetAlertsCreatePage_CapQuery = graphql(`
  query TargetAlertsCreatePage_CapQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      metricAlertRulesLimit
      metricAlertRules {
        id
      }
    }
  }
`);

export function TargetAlertsCreatePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  savedFilterId?: string;
}) {
  const { organizationSlug, projectSlug, targetSlug, savedFilterId } = props;
  const navigate = useNavigate();

  // Direct-navigate gate: a user can land here while at the per-target cap
  // (e.g. they bookmarked the create URL or opened a saved-filter "Create
  // alert" link). Block the form before they fill anything in. The mutation
  // would also reject the create at the resolver layer, but blocking here
  // saves the user a wasted form submission.
  const [capResult] = useQuery({
    query: TargetAlertsCreatePage_CapQuery,
    variables: { organizationSlug, projectSlug, targetSlug },
  });
  const limit = capResult.data?.target?.metricAlertRulesLimit;
  const currentCount = capResult.data?.target?.metricAlertRules.length;
  const isAtLimit = limit !== undefined && currentCount !== undefined && currentCount >= limit;

  const defaultValues: AlertFormValues | undefined = savedFilterId
    ? { ...DEFAULT_ALERT_FORM_VALUES, savedFilterId }
    : undefined;

  if (isAtLimit) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-6 text-center">
        <CircleAlert className="text-neutral-9 size-10" />
        <h2 className="text-neutral-12 m-0 text-base font-medium">You're at the rule limit</h2>
        <p className="text-neutral-10 m-0 max-w-md text-sm">
          This target has {limit} of {limit} configured alert rules. Delete one from the rules list
          to free a slot, then come back to create another.
        </p>
        <Button
          variant="primary"
          label="Manage rules"
          onClick={() => {
            void navigate({
              to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/rules',
              params: { organizationSlug, projectSlug, targetSlug },
            });
          }}
        />
      </div>
    );
  }

  return (
    <AlertForm
      mode="create"
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      targetSlug={targetSlug}
      defaultValues={defaultValues}
      expandAdvanced={!!savedFilterId}
      showPreview
      onSuccess={ruleId => {
        void navigate({
          to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/$ruleId',
          params: { organizationSlug, projectSlug, targetSlug, ruleId },
        });
      }}
    />
  );
}
