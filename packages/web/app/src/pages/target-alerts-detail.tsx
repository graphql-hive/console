import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';

export function TargetAlertsDetailPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  ruleId: string;
}) {
  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Alert Detail"
        description={`Rule ID: ${props.ruleId}`}
      />
      <p className="text-muted-foreground text-sm">Alert detail view coming soon.</p>
    </SubPageLayout>
  );
}
