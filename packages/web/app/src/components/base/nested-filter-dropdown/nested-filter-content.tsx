import { useMemo, useState } from 'react';
import { FilterListSearch } from '@/components/base/nested-filter-dropdown/filter-list-search';
import { ItemRow } from './item-row';
import type { FilterItem, FilterSelection } from './types';

export type NestedFilterContentProps = {
  /** Used in the search input's aria-label */
  label: string;
  /** Available items and their sub-values */
  items: FilterItem[];
  /** Currently selected items/values */
  value: FilterSelection[];
  /** Called when selection changes */
  onChange: (value: FilterSelection[]) => void;
  /** Label for the sub-values (e.g. "versions", "endpoints"). Used in accessibility labels. */
  valuesLabel?: string;
};

export function NestedFilterContent({
  label,
  items,
  value,
  onChange,
  valuesLabel = 'values',
}: NestedFilterContentProps) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(
    () => items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  function isItemSelected(name: string) {
    return value.some(s => s.name === name);
  }

  function getItemSelection(name: string) {
    return value.find(s => s.name === name) ?? null;
  }

  function toggleItem(name: string) {
    if (isItemSelected(name)) {
      onChange(value.filter(s => s.name !== name));
    } else {
      onChange([...value, { name, values: null }]);
    }
  }

  function updateItemValues(name: string, values: string[] | null) {
    const existing = value.find(s => s.name === name);
    if (existing) {
      onChange(value.map(s => (s.name === name ? { ...s, values } : s)));
    } else {
      onChange([...value, { name, values }]);
    }
  }

  return (
    <>
      <FilterListSearch label={label} onSearch={setSearch} value={search} />

      {/* Item list */}
      <div className="mt-2 max-h-64 overflow-y-auto">
        {filteredItems.map(item => {
          const selected = isItemSelected(item.name);
          const selection = getItemSelection(item.name);
          const hasPartialValues =
            selected && selection?.values !== null && (selection?.values?.length ?? 0) > 0;

          return (
            <ItemRow
              key={item.name}
              item={item}
              selected={selected}
              indeterminate={hasPartialValues}
              onToggle={() => toggleItem(item.name)}
              selection={selection}
              onValuesChange={values => updateItemValues(item.name, values)}
              valuesLabel={valuesLabel}
            />
          );
        })}
        {filteredItems.length === 0 && (
          <div className="text-neutral-8 px-2 py-4 text-center text-sm">No items found</div>
        )}
      </div>
    </>
  );
}
