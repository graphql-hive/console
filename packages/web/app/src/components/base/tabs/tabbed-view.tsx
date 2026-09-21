import { type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { TabStrip, type TabItem } from './tabs';

const panelVariants = cva('outline-none', {
  variants: {
    bodyPadding: {
      default: 'p-5',
      // For a view that runs edge to edge: a code view, a list of rows.
      none: '',
    },
  },
});

export type TabbedViewItem = TabItem & {
  /** The view, in the body. */
  content: ReactNode;
};

type TabbedViewProps = {
  items: readonly TabbedViewItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Leads the strip in the band, outside the tablist: the picker that scopes the views. */
  action?: ReactNode;
  bodyPadding?: 'default' | 'none';
  attrs?: Record<string, string>;
};

export function TabbedView({
  items,
  value,
  defaultValue,
  onValueChange,
  action,
  bodyPadding = 'default',
  attrs,
}: TabbedViewProps) {
  return (
    <BaseTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={next => onValueChange?.(String(next))}
      className="border-neutral-5 bg-neutral-1 dark:bg-neutral-2 overflow-hidden rounded-md border"
      {...attrs}
    >
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 flex items-center border-b">
        {action != null ? <div className="flex items-center pl-2">{action}</div> : null}
        <TabStrip items={items} variant="header" activeValue={value} />
      </div>
      {items.map(item => (
        <BaseTabs.Panel
          key={item.value}
          value={item.value}
          className={panelVariants({ bodyPadding })}
        >
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
