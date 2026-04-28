import { AlertForm } from '@/components/target/alerts/alert-form';
import { useNavigate } from '@tanstack/react-router';

export function TargetAlertsCreatePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = props;
  const navigate = useNavigate();

  return (
    <AlertForm
      mode="create"
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      targetSlug={targetSlug}
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
