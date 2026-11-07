import { type ReactNode } from 'react';
import { lenient } from '@/lib/recipe';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { TabStrip, type TabItem } from '../primitives/tabs/tabs';
import { tabbedViewStyles } from './tabbed-view.css';

const panelVariants = lenient(tabbedViewStyles.panel);

export type TabbedViewItem = TabItem & {
  /** The view, in the body. */
  content: ReactNode;
};

type TabbedViewProps = {
  items: readonly TabbedViewItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  bodyPadding?: 'default' | 'none';
  attrs?: Record<string, string>;
};

export function TabbedView({
  items,
  value,
  defaultValue,
  onValueChange,
  bodyPadding = 'default',
  attrs,
}: TabbedViewProps) {
  return (
    <BaseTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={next => onValueChange?.(String(next))}
      className={tabbedViewStyles.root}
      {...attrs}
    >
      <div className={tabbedViewStyles.header}>
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
