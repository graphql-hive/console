import { type ComponentType, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { Link, type LinkOptions } from '@tanstack/react-router';
import { Tooltip } from '../floating/tooltip/tooltip';
import { focusRingQuiet } from '../shared-styles';

export type NavigationVariant = 'underline' | 'pill' | 'list';
export type NavigationSize = 'default' | 'sm';

type LinkAttributes = Pick<LinkOptions, 'to' | 'params' | 'search'>;

export type NavigationItem = LinkAttributes & {
  /** Also the item's key, so unique within one nav. */
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Explains the destination on hover: what a filter shows, say. */
  tooltip?: ReactNode;
  /** Hidden items are left out entirely, as a permission gate needs. */
  visible?: boolean;
  /**
   * For the item whose `to` is the parent path itself (Schema at the target root, General at
   * `/settings`): the router counts a link as current on a path prefix, which would make that item
   * current on every sibling page.
   */
  exact?: boolean;
  /**
   * For a search-driven default item whose `search` sets its key to `undefined` (the Details
   * section of a proposal): current only while the URL has no such key at all.
   */
  explicitUndefined?: boolean;
  /** Extra attributes for the anchor, `data-cy` for one. */
  attrs?: Record<string, string>;
};

type NavigationProps = {
  items: readonly NavigationItem[];
  variant?: NavigationVariant;
  size?: NavigationSize;
  /** Draws placeholders in place of the links while the page that owns them loads. */
  loading?: boolean;
  /** Sits at the bar's far edge: the target's "Connect to CDN", say. Bars only. */
  actions?: ReactNode;
  'aria-label'?: string;
  attrs?: Record<string, string>;
};

const listVariants = cva('', {
  variants: {
    variant: {
      underline: 'flex flex-row items-center',
      pill: 'bg-neutral-3 inline-flex flex-row items-center gap-1 rounded-md p-1',
      list: 'flex w-48 shrink-0 flex-col space-y-1',
    },
  },
});

const itemVariants = cva(
  [
    'inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors',
    focusRingQuiet,
  ],
  {
    variants: {
      variant: {
        underline: 'border-b-2 focus-visible:outline-offset-2',
        pill: 'rounded-sm focus-visible:outline-offset-2',
        list: 'justify-start rounded-md px-4 py-2 text-left',
      },
      size: {
        default: '',
        sm: '',
      },
    },
    compoundVariants: [
      { variant: 'underline', size: 'default', class: 'px-4 py-3' },
      { variant: 'underline', size: 'sm', class: 'px-3 py-2' },
      { variant: 'pill', size: 'default', class: 'px-4 py-1.5' },
      { variant: 'pill', size: 'sm', class: 'px-3 py-1' },
    ],
  },
);

const activeClasses: Record<NavigationVariant, string> = {
  underline: 'text-neutral-12 border-accent',
  pill: 'text-neutral-12 bg-neutral-5',
  list: 'text-neutral-12 bg-neutral-5 hover:bg-neutral-5 dark:bg-neutral-3 dark:hover:bg-neutral-3',
};

const inactiveClasses: Record<NavigationVariant, string> = {
  underline: 'text-neutral-11 hover:text-neutral-12 hover:border-accent_80 border-transparent',
  pill: 'text-neutral-11 hover:text-neutral-12',
  list: 'text-neutral-11 hover:text-neutral-12 hover:underline',
};

export function Navigation({
  items,
  variant = 'underline',
  size = 'default',
  loading = false,
  actions,
  'aria-label': ariaLabel = 'Secondary',
  attrs,
}: NavigationProps) {
  const links = loading ? (
    <div
      className={
        variant === 'list'
          ? 'flex w-48 flex-col gap-y-3 px-4 py-2'
          : 'flex flex-row gap-x-8 border-b-2 border-b-transparent px-4 py-3'
      }
    >
      {[0, 1, 2].map(index => (
        <div key={index} className="bg-neutral-5 h-5 w-12 animate-pulse rounded-full" />
      ))}
    </div>
  ) : (
    <nav aria-label={ariaLabel}>
      <ul className={listVariants({ variant })}>
        {items
          .filter(item => item.visible !== false)
          .map(
            ({
              label,
              icon: Icon,
              tooltip,
              visible: _visible,
              exact,
              explicitUndefined,
              attrs: itemAttrs,
              ...link
            }) => {
              const anchor = (
                <Link
                  {...link}
                  activeOptions={{
                    exact: exact === true,
                    // A link without `search` stays current whatever the URL's search holds.
                    includeSearch: link.search !== undefined,
                    explicitUndefined: explicitUndefined === true,
                  }}
                  className={itemVariants({ variant, size })}
                  activeProps={{ className: activeClasses[variant] }}
                  inactiveProps={{ className: inactiveClasses[variant] }}
                  {...itemAttrs}
                >
                  {Icon ? <Icon className="size-4 shrink-0" /> : null}
                  {label}
                </Link>
              );
              return (
                <li key={label} className="contents">
                  {tooltip == null ? (
                    anchor
                  ) : (
                    <Tooltip
                      trigger={<span className="inline-flex">{anchor}</span>}
                      content={tooltip}
                    />
                  )}
                </li>
              );
            },
          )}
      </ul>
    </nav>
  );

  if (actions == null) {
    return <div {...attrs}>{links}</div>;
  }
  return (
    <div className="flex items-center justify-between" {...attrs}>
      {links}
      {actions}
    </div>
  );
}
