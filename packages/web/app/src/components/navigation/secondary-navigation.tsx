import { ReactNode } from 'react';
import { Tabs, TabsList } from '../ui/tabs';
import { SecondaryNavLink, type SecondaryNavLinkProps } from './secondary-nav-link';

export function SecondaryNavigation({
  page,
  loading,
  actions,
  className,
  links,
}: {
  page?: string;
  loading?: boolean;
  actions?: ReactNode;
  className?: string;
  links: SecondaryNavLinkProps[];
}) {
  return (
    <div className="h-(--tabs-navbar-height) border-neutral-5 bg-neutral-2 dark:bg-neutral-3 relative border-b">
      <div className="container flex items-center justify-between">
        {loading ? (
          <div className="flex flex-row gap-x-8 border-b-2 border-b-transparent px-4 py-3">
            <div className="bg-neutral-5 h-5 w-12 animate-pulse rounded-full" />
            <div className="bg-neutral-5 h-5 w-12 animate-pulse rounded-full" />
            <div className="bg-neutral-5 h-5 w-12 animate-pulse rounded-full" />
          </div>
        ) : (
          <Tabs value={page} className={className}>
            <TabsList variant="menu">
              {links.map(link => (
                <SecondaryNavLink key={link.value} {...link} />
              ))}
            </TabsList>
          </Tabs>
        )}
        {actions}
      </div>
    </div>
  );
}
