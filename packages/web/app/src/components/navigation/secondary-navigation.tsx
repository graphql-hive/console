import { ReactNode } from 'react';
import { Navigation, type NavigationItem } from '../ui/navigation/navigation';
import { secondaryNavigationStyles } from './secondary-navigation.css';

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
    <div className={secondaryNavigationStyles.root}>
      <div className={secondaryNavigationStyles.container}>
        <Navigation items={links} loading={loading} actions={actions} />
      </div>
    </div>
  );
}
