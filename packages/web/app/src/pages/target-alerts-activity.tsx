import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';

export function TargetAlertsActivityPage() {
  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Alert activity"
        description="Monitor alert firings, recoveries, and state changes."
      />
      <p className="text-muted-foreground text-sm">Alert activity coming soon.</p>
    </SubPageLayout>
  );
}
