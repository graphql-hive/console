import { type ComponentType, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Tooltip } from '../floating/tooltip/tooltip';

export type TabsVariant = 'underline' | 'header';
export type TabsSize = 'default' | 'sm';
export type TabsOrientation = 'horizontal' | 'vertical';

export type TabItem = {
  value: string;
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  /** Shown on hover, disabled tabs included, so a tab can say why it cannot be picked. */
  tooltip?: ReactNode;
  /** The panel. Optional: a page that renders the view itself below the tabs leaves it out. */
  content?: ReactNode;
  /** Test hooks and the like, landed on the tab button. */
  attrs?: Record<string, string>;
};

type TabsProps = {
  items: readonly TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `header` is the strip in TabbedView's band, at the band's height. */
  variant?: TabsVariant;
  size?: TabsSize;
  /** `vertical` stacks the tabs in a column with the panels beside them. */
  orientation?: TabsOrientation;
  attrs?: Record<string, string>;
};

const rootVariants = cva('', {
  variants: {
    variant: {
      underline: '',
      header: 'w-full',
    },
    orientation: {
      horizontal: '',
      vertical: 'flex gap-8',
    },
  },
});

const listVariants = cva('relative flex', {
  variants: {
    variant: {
      underline: 'border-neutral-5 gap-1',
      // The band around it draws the border and fill.
      header: 'h-10 grow gap-1 px-2',
    },
    orientation: {
      horizontal: 'items-center',
      vertical: 'flex-col items-stretch',
    },
  },
  compoundVariants: [
    { variant: 'underline', orientation: 'horizontal', class: 'border-b' },
    { variant: 'underline', orientation: 'vertical', class: 'border-l' },
  ],
});

const tabVariants = cva(
  cn(
    'relative z-10 inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap font-medium transition-colors',
    'text-neutral-10 hover:text-neutral-12 data-[active]:text-accent',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  ),
  {
    variants: {
      variant: {
        underline: '',
        header: 'h-full',
      },
      // Padding and text size are set per variant and size pair below: cva concatenates, so an
      // element must never carry two utilities for one property.
      size: {
        default: '',
        sm: '',
      },
      orientation: {
        horizontal: '',
        vertical: 'justify-start',
      },
    },
    compoundVariants: [
      { variant: 'underline', size: 'default', class: 'px-3 py-2 text-sm' },
      { variant: 'underline', size: 'sm', class: 'px-2.5 py-1.5 text-xs' },
      { variant: 'header', size: 'default', class: 'px-2.5 py-0 text-xs' },
      { variant: 'header', size: 'sm', class: 'px-2 py-0 text-xs' },
      { variant: 'underline', orientation: 'horizontal', class: '-mb-px' },
      { variant: 'underline', orientation: 'vertical', class: '-ml-px' },
    ],
  },
);

const indicatorVariants = cva(
  'bg-accent ease-authentic absolute transition-[left,width,top,height] duration-200',
  {
    variants: {
      variant: {
        underline: '',
        header: '-bottom-px left-[var(--active-tab-left)] h-0.5 w-[var(--active-tab-width)]',
      },
      orientation: {
        horizontal: '',
        vertical: '',
      },
    },
    compoundVariants: [
      {
        variant: 'underline',
        orientation: 'horizontal',
        class: '-bottom-px left-[var(--active-tab-left)] h-0.5 w-[var(--active-tab-width)]',
      },
      {
        variant: 'underline',
        orientation: 'vertical',
        class: '-left-px top-[var(--active-tab-top)] h-[var(--active-tab-height)] w-0.5',
      },
    ],
  },
);

const panelVariants = cva('outline-none', {
  variants: {
    orientation: {
      horizontal: 'pt-4',
      vertical: 'min-w-0 flex-1',
    },
  },
});

const iconSize = { default: 'size-4', sm: 'size-3.5' } as const;

export function TabStrip({
  items,
  variant = 'underline',
  size = 'default',
  orientation = 'horizontal',
}: Pick<TabsProps, 'items' | 'variant' | 'size' | 'orientation'>) {
  const icon = variant === 'header' ? iconSize.sm : iconSize[size];
  return (
    <BaseTabs.List className={listVariants({ variant, orientation })}>
      {items.map(item => {
        const Icon = item.icon;
        const tab = (
          <BaseTabs.Tab
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={tabVariants({ variant, size, orientation })}
            {...item.attrs}
          >
            {Icon ? <Icon className={cn(icon, 'shrink-0')} /> : null}
            {item.label}
          </BaseTabs.Tab>
        );
        if (item.tooltip == null) {
          return tab;
        }
        // A disabled button fires no pointer events, so the span carries the hover.
        return (
          <Tooltip
            key={item.value}
            trigger={<span className="inline-flex">{tab}</span>}
            content={item.tooltip}
          />
        );
      })}
      <BaseTabs.Indicator className={indicatorVariants({ variant, orientation })} />
    </BaseTabs.List>
  );
}

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = 'underline',
  size = 'default',
  orientation = 'horizontal',
  attrs,
}: TabsProps) {
  return (
    <BaseTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={next => onValueChange?.(String(next))}
      orientation={orientation}
      className={rootVariants({ variant, orientation })}
      {...attrs}
    >
      <TabStrip items={items} variant={variant} size={size} orientation={orientation} />
      {items.map(item =>
        item.content != null ? (
          <BaseTabs.Panel
            key={item.value}
            value={item.value}
            className={panelVariants({ orientation })}
          >
            {item.content}
          </BaseTabs.Panel>
        ) : null,
      )}
    </BaseTabs.Root>
  );
}
