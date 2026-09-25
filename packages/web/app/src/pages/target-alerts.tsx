import { useQuery } from 'urql';
import { Navigation } from '@/components/base/navigation/navigation';
import { LayoutContent } from '@/components/layouts/layout-content';
import { Meta } from '@/components/ui/meta';
import { PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { graphql } from '@/gql';
import { useRedirect } from '@/lib/access/common';
import { useSlugs } from '@/lib/hooks';
import { Outlet } from '@tanstack/react-router';

const TargetAlertsPageQuery = graphql(`
  query TargetAlertsPageQuery(
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
      viewerCanUseMetricAlertRules
    }
  }
`);

/** The gate every alerts page sits behind; the pages with the nav and the rule detail render in it. */
export function TargetAlertsPage() {
  const slugs = useSlugs('target');
  const [data] = useQuery({ query: TargetAlertsPageQuery, variables: slugs });
  const target = data.data?.target;

  useRedirect({
    entity: target,
    canAccess: target?.viewerCanUseMetricAlertRules === true,
    redirectTo(router) {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params: slugs,
        replace: true,
      });
    },
  });

  if (target?.viewerCanUseMetricAlertRules === false) {
    return null;
  }

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
            id: 'activity',
            label: 'Alert activity',
            to: '/$organizationSlug/$projectSlug/$targetSlug/alerts',
            params: slugs,
            exact: true,
          },
          {
            id: 'rules',
            label: 'Alert rules',
            to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/rules',
            params: slugs,
          },
          {
            id: 'create',
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
