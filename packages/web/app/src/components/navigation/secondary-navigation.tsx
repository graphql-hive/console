import { ReactNode } from 'react';
import { Navigation, type NavigationItem } from '../ui/navigation/navigation';

/** The bar under the organization, project and target headers: base Navigation in the app's chrome. */
export function SecondaryNavigation({
  loading,
  actions,
  links,
}: {
  loading?: boolean;
  actions?: ReactNode;
  links: NavigationItem[];
}) {
  return (
    <div className="relative h-(--tabs-navbar-height) border-b border-line bg-surface-card">
      <div className="container">
        <Navigation items={links} loading={loading} actions={actions} />
      </div>
    </div>
  );
}
