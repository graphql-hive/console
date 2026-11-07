import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { lenient } from '@/lib/recipe';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Tooltip } from '../floating/tooltip/tooltip';
import { tabsStyles } from './tabs.css';

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

const rootVariants = lenient(tabsStyles.root);

const scrollerVariants = lenient(tabsStyles.scroller);

const listVariants = lenient(tabsStyles.list);

const tabVariants = lenient(tabsStyles.tab);

const indicatorVariants = lenient(tabsStyles.indicator);

const panelVariants = lenient(tabsStyles.panel);

export function TabStrip({
  items,
  variant = 'underline',
  size = 'default',
  orientation = 'horizontal',
  activeValue,
}: Pick<TabsProps, 'items' | 'variant' | 'size' | 'orientation'> & {
  /** The controlled value, so a tab picked from outside the strip is scrolled into view. */
  activeValue?: string;
}) {
  const icon = tabsStyles.icon[variant === 'header' ? 'sm' : size];
  const scrollerRef = useRef<HTMLDivElement>(null);

  // A tab activated from outside the strip, like a service just added to a proposal, can sit
  // past the scroller's edge. Clicks and arrow keys scroll on their own, since focus does.
  // Only the scroller moves: scrollIntoView could drag the page to the strip as well.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const tab = scroller?.querySelector<HTMLElement>('[role="tab"][data-active]');
    if (!scroller || !tab) {
      return;
    }
    const overflow = tab.getBoundingClientRect().right - scroller.getBoundingClientRect().right;
    const underflow = scroller.getBoundingClientRect().left - tab.getBoundingClientRect().left;
    scroller.scrollLeft += overflow > 0 ? overflow : underflow > 0 ? -underflow : 0;
  }, [activeValue]);

  const list = (
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
            {Icon ? <Icon className={icon} /> : null}
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
            trigger={<span className={tabsStyles.tooltipTrigger}>{tab}</span>}
            content={item.tooltip}
          />
        );
      })}
      <BaseTabs.Indicator className={indicatorVariants({ variant, orientation })} />
    </BaseTabs.List>
  );
  if (orientation === 'vertical') {
    return list;
  }
  return (
    <div ref={scrollerRef} className={scrollerVariants({ orientation })}>
      {list}
    </div>
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
      <TabStrip
        items={items}
        variant={variant}
        size={size}
        orientation={orientation}
        activeValue={value}
      />
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
