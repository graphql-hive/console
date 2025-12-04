import { Link, type LinkProps } from '@tanstack/react-router';

export type SecondaryNavigationItemProps = {
  activeOptions?: LinkProps['activeOptions'];
  /**
   * Optional: display this SecondaryNavigationItem only if this provided condition returns true
   */
  displayCondition?: boolean;
  params: LinkProps['params'];
  search?: LinkProps['search'];
  /**
   * The text to show for this link
   */
  title: string;
  to: LinkProps['to'];
};

export const SecondaryNavigationItem = ({
  activeOptions,
  displayCondition,
  params,
  search,
  title,
  to,
}: SecondaryNavigationItemProps) => {
  console.log('SecondaryNavigationItem render');

  if (displayCondition !== undefined && !displayCondition) {
    return null;
  }

  return (
    <Link
      activeOptions={activeOptions}
      to={to}
      params={params}
      search={search}
      className="cursor-pointer !appearance-none border-b-2 border-b-transparent px-4 py-3 text-sm font-medium text-white transition hover:border-b-orange-900 data-[status=active]:border-b-orange-500"
    >
      {title}
    </Link>
  );
};
