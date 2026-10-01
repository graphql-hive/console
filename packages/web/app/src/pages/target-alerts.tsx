import { LayoutContent } from '@/components/layouts/layout-content';
import { Meta } from '@/components/ui/meta';
import { Navigation } from '@/components/ui/navigation/navigation';
import { PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { useSlugs } from '@/lib/hooks';
import { Outlet } from '@tanstack/react-router';

// The pages with the nav and the rule detail render in here; the route's loader gates them.
export function TargetAlertsPage() {
  return (
    <LayoutContent>
      <Meta title="Alerts" />
      <Outlet />
    </LayoutContent>
  );
}

/** Activity (the bare URL), rules and create beside their nav. */
export function TargetAlertsWithNav() {
  const slugs = useSlugs('target');
  return (
    <PageLayout>
      <Navigation
        aria-label="Alerts"
        variant="list"
        items={[
          {
            label: 'Alert activity',
            to: '/$organizationSlug/$projectSlug/$targetSlug/alerts',
            params: slugs,
            exact: true,
          },
          {
            label: 'Alert rules',
            to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/rules',
            params: slugs,
          },
          {
            label: 'Create a new alert',
            to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/create',
            params: slugs,
          },
        ]}
      />
      <PageLayoutContent>
        <Outlet />
      </PageLayoutContent>
    </PageLayout>
  );
}
