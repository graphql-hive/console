import { ReactNode } from 'react';
import {
  SecondaryNavigation as BaseSecondaryNavigation,
  type SecondaryNavigationItem,
} from '../base/navigation/secondary-navigation/secondary-navigation';

/** The bar under the organization, project and target headers: base SecondaryNavigation in the app's chrome. */
export function SecondaryNavigation({
  page,
  loading,
  actions,
  links,
}: {
  page?: string;
  loading?: boolean;
  actions?: ReactNode;
  links: SecondaryNavigationItem[];
}) {
  return (
    <div className="h-(--tabs-navbar-height) border-neutral-5 bg-neutral-2 dark:bg-neutral-3 relative border-b">
      <div className="container">
        <BaseSecondaryNavigation value={page} items={links} loading={loading} actions={actions} />
      </div>
    </div>
  );
}
