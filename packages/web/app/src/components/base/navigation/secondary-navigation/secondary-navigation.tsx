import { type ComponentType, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { Link, type LinkOptions } from '@tanstack/react-router';
import { Tooltip } from '../../floating/tooltip/tooltip';

export type SecondaryNavigationVariant = 'underline' | 'pill';
export type SecondaryNavigationSize = 'default' | 'sm';

type LinkAttributes = Pick<LinkOptions, 'to' | 'params' | 'search'>;

export type SecondaryNavigationItem = LinkAttributes & {
  value: string;
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Explains the destination on hover: what a filter shows, say. */
  tooltip?: ReactNode;
  /** Hidden items are left out entirely, as a permission gate needs. */
  visible?: boolean;
};

type SecondaryNavigationProps = {
  items: readonly SecondaryNavigationItem[];
  /** The current page's `value`. */
  value?: string;
  variant?: SecondaryNavigationVariant;
  size?: SecondaryNavigationSize;
  /** Draws placeholders in place of the links while the page that owns them loads. */
  loading?: boolean;
  /** Sits at the bar's far edge: the target's "Connect to CDN", say. */
  actions?: ReactNode;
  'aria-label'?: string;
  attrs?: Record<string, string>;
};

const listVariants = cva('flex flex-row items-center', {
  variants: {
    variant: {
      underline: '',
      pill: 'bg-neutral-3 inline-flex gap-1 rounded-md p-1',
    },
  },
});

// Colors are keyed on `active` throughout: cva concatenates, so an element must never carry two
// utilities for one property or the stylesheet's order picks the winner.
const itemVariants = cva(
  [
    'inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  ],
  {
    variants: {
      variant: {
        underline: 'border-b-2',
        pill: 'rounded-sm',
      },
      size: {
        default: 'px-4 py-3 text-sm',
        sm: 'px-3 py-2 text-sm',
      },
      active: {
        true: 'text-neutral-12',
        false: 'text-neutral-11 hover:text-neutral-12',
      },
    },
    compoundVariants: [
      { variant: 'underline', active: false, class: 'hover:border-accent_80 border-transparent' },
      { variant: 'underline', active: true, class: 'border-accent' },
      { variant: 'pill', size: 'default', class: 'py-1.5' },
      { variant: 'pill', size: 'sm', class: 'py-1' },
      { variant: 'pill', active: true, class: 'bg-neutral-5' },
    ],
  },
);

export function SecondaryNavigation({
  items,
  value,
  variant = 'underline',
  size = 'default',
  loading = false,
  actions,
  'aria-label': ariaLabel = 'Secondary',
  attrs,
}: SecondaryNavigationProps) {
  const links = loading ? (
    <div className="flex flex-row gap-x-8 border-b-2 border-b-transparent px-4 py-3">
      {[0, 1, 2].map(index => (
        <div key={index} className="bg-neutral-5 h-5 w-12 animate-pulse rounded-full" />
      ))}
    </div>
  ) : (
    <nav aria-label={ariaLabel}>
      <ul className={listVariants({ variant })}>
        {items
          .filter(item => item.visible !== false)
          .map(({ value: itemValue, label, icon: Icon, tooltip, visible: _visible, ...link }) => {
            const active = itemValue === value;
            const anchor = (
              <Link
                {...link}
                // The router marks a link current on a prefix match, which would make the area's
                // root page current everywhere; `value` decides, so its own match must be exact.
                activeOptions={{ exact: true }}
                className={itemVariants({ variant, size, active })}
                aria-current={active ? 'page' : undefined}
              >
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                {label}
              </Link>
            );
            return (
              <li key={itemValue} className="contents">
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
          })}
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
