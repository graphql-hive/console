import {
  AlertForm,
  DEFAULT_ALERT_FORM_VALUES,
  type AlertFormValues,
} from '@/components/target/alerts/alert-form';
import { useNavigate } from '@tanstack/react-router';

export function TargetAlertsCreatePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  savedFilterId?: string;
}) {
  const { organizationSlug, projectSlug, targetSlug, savedFilterId } = props;
  const navigate = useNavigate();

  const defaultValues: AlertFormValues | undefined = savedFilterId
    ? { ...DEFAULT_ALERT_FORM_VALUES, savedFilterId }
    : undefined;

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
