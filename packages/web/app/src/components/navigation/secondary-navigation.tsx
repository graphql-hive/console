import { Fragment, ReactElement } from 'react';
import {
  SecondaryNavigationItem,
  SecondaryNavigationItemProps,
} from '@/components/navigation/secondary-navigation-item';

type SecondaryNavigationProps = {
  /**
   * Optional: An array of actions to right-align (buttons, links, etc)
   */
  actions?: Array<{
    displayCondition?: boolean;
    actionItem: ReactElement;
  }>;
  /**
   * Show the skeleton unless this condition is true
   */
  displayCondition: boolean;
  items: Omit<SecondaryNavigationItemProps, 'params'>[];
  /**
   * Link params that are shared for all items
   */
  params: SecondaryNavigationItemProps['params'];
};

export const SecondaryNavigation = ({
  actions,
  displayCondition,
  items,
  params,
}: SecondaryNavigationProps) => {
  return (
    <div className="relative h-[--tabs-navbar-height] border-b border-gray-800">
      <div className="container flex items-center justify-between">
        {!displayCondition ? (
          <div className="flex flex-row gap-x-8 border-b-2 border-b-transparent px-4 py-3">
            <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
            <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
            <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
          </div>
        ) : (
          <>
            <div className="relative flex items-center text-gray-700">
              {items.map(item => (
                <SecondaryNavigationItem key={item.title} params={params} {...item} />
              ))}
            </div>
            {actions
              ?.filter(action => action.displayCondition !== false)
              .map((action, index) => <Fragment key={index}>{action.actionItem}</Fragment>)}
          </>
        )}
      </div>
    </div>
  );
};
