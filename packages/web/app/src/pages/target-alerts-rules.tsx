import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';

export function TargetAlertsRulesPage() {
  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Configured alerts"
        description="The following alerts are currently active for this target."
      />
      <p className="text-neutral-10 text-sm">Alert rules list coming soon.</p>
    </SubPageLayout>
  );
}
