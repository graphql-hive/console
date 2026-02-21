import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Menu, MenuItem } from '@/components/base/menu/menu';
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
  unavailable?: boolean;
}

function ItemName({ name, unavailable }: { name: string; unavailable?: boolean }) {
  return (
    <span
      className={`flex-1 truncate ${unavailable ? 'text-neutral-8 line-through' : ''}`}
      title={unavailable ? 'Not found in selected date range' : undefined}
    >
      {name}
    </span>
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
  unavailable,
}: ItemRowProps) {
  const hasValues = item.values.length > 0;

  if (!hasValues) {
    return (
      <MenuItem closeOnClick={false} onClick={onToggle}>
        <Checkbox checked={selected} indeterminate={indeterminate} size="sm" visual />
        <ItemName name={item.name} unavailable={unavailable} />
      </MenuItem>
    );
  }

  return (
    <Menu
      trigger={
        <MenuItem onClick={onToggle}>
          <Checkbox checked={selected} indeterminate={indeterminate} size="sm" visual />
          <ItemName name={item.name} unavailable={unavailable} />
        </MenuItem>
      }
      openOnHover
      delay={100}
      closeDelay={150}
      sections={[
        <ValuesSubPanel
          key="values"
          itemName={item.name}
          values={item.values}
          selectedValues={selected ? (selection?.values ?? null) : []}
          onValuesChange={onValuesChange}
          valuesLabel={valuesLabel}
        />,
      ]}
    />
  );
}
