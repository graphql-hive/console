import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { NavLayout, PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { graphql } from '@/gql';
import { useRedirect } from '@/lib/access/common';
import { Link, Outlet, useLocation } from '@tanstack/react-router';

const navItems = [
  { label: 'Alert activity', segment: 'activity' },
  { label: 'Alert rules', segment: 'rules' },
  { label: 'Create a new alert', segment: 'create' },
] as const;

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

export function TargetAlertsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const params = {
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  };

  const [data] = useQuery({
    query: TargetAlertsPageQuery,
    variables: params,
  });
  const target = data.data?.target;
  const location = useLocation();

  useRedirect({
    entity: target,
    canAccess: target?.viewerCanUseMetricAlertRules === true,
    redirectTo(router) {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params,
        replace: true,
      });
    },
  });

  if (target?.viewerCanUseMetricAlertRules === false) {
    return null;
  }

  // The detail page (path matches /alerts/{ruleId}) renders full-width without the
  // secondary nav. The literal segment routes (rules / activity / create) keep the nav.
  const lastSegment = location.pathname.replace(/\/$/, '').split('/').pop();
  const literalSegments = new Set(['alerts', 'rules', 'activity', 'create']);
  const isDetailRoute = !!lastSegment && !literalSegments.has(lastSegment);

  if (isDetailRoute) {
    return (
      <>
        <Meta title="Alerts" />
        <Outlet />
      </>
    );
  }

  return (
    <>
      <Meta title="Alerts" />
      <PageLayout>
        <NavLayout>
          {navItems.map(item => (
            <Button
              key={item.segment}
              variant="ghost"
              className="h-auto justify-start text-left"
              asChild
            >
              <Link
                to={`/$organizationSlug/$projectSlug/$targetSlug/alerts/${item.segment}`}
                params={params}
                activeProps={{
                  className:
                    'text-neutral-12 bg-neutral-5 hover:bg-neutral-5 dark:bg-neutral-3 dark:hover:bg-neutral-3',
                }}
                inactiveProps={{
                  className: 'text-neutral-11 hover:bg-transparent hover:underline',
                }}
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </NavLayout>
        <PageLayoutContent>
          <Outlet />
        </PageLayoutContent>
      </PageLayout>
    </>
  );
}
