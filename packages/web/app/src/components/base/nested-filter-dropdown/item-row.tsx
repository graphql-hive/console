import { Check, Minus } from 'lucide-react';
import { Checkbox, CheckboxIndicator } from '@/components/base/checkbox';
import { MenuItem, MenuSubmenu, MenuSubmenuContent, MenuSubmenuTrigger } from '@/components/base/menu';
import { cn } from '@/lib/utils';
import type { FilterItem, FilterSelection } from './types';
import { ValuesSubPanel } from './values-sub-panel';

interface ItemRowProps {
  item: FilterItem;
  selected: boolean;
  indeterminate: boolean;
  onToggle: () => void;
  selection: FilterSelection | null;
  onValuesChange: (values: string[] | null) => void;
  valuesLabel: string;
}

function CheckboxVisual({
  selected,
  indeterminate,
}: {
  selected: boolean;
  indeterminate: boolean;
}) {
  return (
    <Checkbox
      checked={selected}
      indeterminate={indeterminate}
      size="sm"
      tabIndex={-1}
      aria-hidden
      style={{ pointerEvents: 'none' }}
    >
      <CheckboxIndicator>
        {indeterminate ? (
          <Minus className="size-3" strokeWidth={3} />
        ) : (
          <Check className="size-3" strokeWidth={3} />
        )}
      </CheckboxIndicator>
    </Checkbox>
  );
}

export function ItemRow({
  item,
  selected,
  indeterminate,
  onToggle,
  selection,
  onValuesChange,
  valuesLabel,
}: ItemRowProps) {
  const hasValues = item.values.length > 0;

  if (!hasValues) {
    return (
      <MenuItem closeOnClick={false} onClick={onToggle} className="gap-2">
        <CheckboxVisual selected={selected} indeterminate={indeterminate} />
        <span
          className={cn('flex-1 truncate', selected ? 'text-neutral-12' : 'text-neutral-11')}
        >
          {item.name}
        </span>
      </MenuItem>
    );
  }

  return (
    <MenuSubmenu>
      <MenuSubmenuTrigger
        openOnHover
        delay={100}
        closeDelay={150}
        onClick={onToggle}
        className="gap-2"
      >
        <CheckboxVisual selected={selected} indeterminate={indeterminate} />
        <span
          className={cn('flex-1 truncate', selected ? 'text-neutral-12' : 'text-neutral-11')}
        >
          {item.name}
        </span>
      </MenuSubmenuTrigger>

      <MenuSubmenuContent className="w-56">
        <ValuesSubPanel
          itemName={item.name}
          values={item.values}
          selectedValues={selected ? (selection?.values ?? null) : []}
          onValuesChange={onValuesChange}
          valuesLabel={valuesLabel}
        />
      </MenuSubmenuContent>
    </MenuSubmenu>
  );
}
