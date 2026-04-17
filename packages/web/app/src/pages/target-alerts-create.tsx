import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';

export function TargetAlertsCreatePage() {
  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Create a new alert"
        description="Select the alert type and range for this alert."
      />
      <p className="text-muted-foreground text-sm">Create alert form coming soon.</p>
    </SubPageLayout>
  );
}
