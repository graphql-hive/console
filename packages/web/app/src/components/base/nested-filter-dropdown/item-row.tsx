import { Checkbox } from '@/components/base/checkbox/checkbox';
import { MenuContent, MenuItem, MenuSubmenu } from '@/components/base/menu/menu';
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

function ItemName({ name }: { name: string }) {
  return <span className="flex-1 truncate">{name}</span>;
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
      <MenuItem inSubmenu closeOnClick={false} onClick={onToggle}>
        <Checkbox checked={selected} indeterminate={indeterminate} size="sm" visual />
        <ItemName name={item.name} />
      </MenuItem>
    );
  }

  return (
    <MenuSubmenu>
      <MenuItem subMenuTrigger openOnHover delay={100} closeDelay={150} onClick={onToggle}>
        <Checkbox checked={selected} indeterminate={indeterminate} size="sm" visual />
        <ItemName name={item.name} />
      </MenuItem>

      <MenuContent subMenu>
        <ValuesSubPanel
          itemName={item.name}
          values={item.values}
          selectedValues={selected ? (selection?.values ?? null) : []}
          onValuesChange={onValuesChange}
          valuesLabel={valuesLabel}
        />
      </MenuContent>
    </MenuSubmenu>
  );
}
