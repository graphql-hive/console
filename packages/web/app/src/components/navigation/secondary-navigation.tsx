import { ReactNode } from 'react';
import { Navigation, type NavigationItem } from '../base/navigation/navigation';

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
    <div className="h-(--tabs-navbar-height) border-line bg-surface-card relative border-b">
      <div className="container">
        <Navigation items={links} loading={loading} actions={actions} />
      </div>
    </div>
  );
}
