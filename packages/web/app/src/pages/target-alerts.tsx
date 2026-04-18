import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { NavLayout, PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { Link, Outlet } from '@tanstack/react-router';

const navItems = [
  { label: 'Alert activity', segment: 'activity' },
  { label: 'Alert rules', segment: 'rules' },
  { label: 'Create a new alert', segment: 'create' },
] as const;

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
