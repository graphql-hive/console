import { useMemo, useState } from 'react';
import { FilterListSearch } from '@/components/base/filter-dropdown/filter-list-search';
import { ItemRow } from './item-row';
import type { FilterItem, FilterSelection } from './types';

export type FilterContentProps = {
  /** Used in the search input's aria-label */
  label: string;
  /** Available items and their sub-values */
  items: FilterItem[];
  /** Currently selected items */
  selectedItems: FilterSelection[];
  /** Called when selection changes */
  onChange: (value: FilterSelection[]) => void;
  /** Label for the sub-values (e.g. "versions", "endpoints"). Used in accessibility labels. */
  valuesLabel?: string;
};

export function FilterContent({
  label,
  items,
  selectedItems,
  onChange,
  valuesLabel = 'values',
}: FilterContentProps) {
  const [search, setSearch] = useState('');

  function getKey(item: FilterItem | FilterSelection): string {
    return item.id ?? item.name;
  }

  const filteredItems = useMemo(() => {
    const matched = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
    // Sort unavailable items to the bottom while preserving relative order
    return matched.sort((a, b) => (a.unavailable ? 1 : 0) - (b.unavailable ? 1 : 0));
  }, [items, search]);

  function isItemSelected(item: FilterItem) {
    const key = getKey(item);
    return selectedItems.some(s => getKey(s) === key);
  }

  function getItemSelection(item: FilterItem) {
    const key = getKey(item);
    return selectedItems.find(s => getKey(s) === key) ?? null;
  }

  function toggleItem(item: FilterItem) {
    const key = getKey(item);
    if (isItemSelected(item)) {
      onChange(selectedItems.filter(s => getKey(s) !== key));
    } else {
      onChange([...selectedItems, { id: item.id, name: item.name, values: null }]);
    }
  }

  function updateItemValues(item: FilterItem, values: string[] | null) {
    const key = getKey(item);
    const existing = selectedItems.find(s => getKey(s) === key);
    if (existing) {
      onChange(selectedItems.map(s => (getKey(s) === key ? { ...s, values } : s)));
    } else {
      onChange([...selectedItems, { id: item.id, name: item.name, values }]);
    }
  }

  return (
    <>
      <FilterListSearch label={label} onSearch={setSearch} value={search} />

      {/* Note about unavailable items */}
      {items.some(item => item.unavailable) && (
        <div className="text-neutral-11 mt-2 px-4 py-1 text-xs">
          <span className="line-through">Struck-through</span> items are not found in the selected
          date range.
        </div>
      )}

      {/* Item list */}
      <div className="mt-2 max-h-64 overflow-y-auto">
        {filteredItems.map(item => {
          const selected = isItemSelected(item);
          const selection = getItemSelection(item);
          const hasPartialValues =
            selected && selection?.values !== null && (selection?.values?.length ?? 0) > 0;

          return (
            <ItemRow
              key={getKey(item)}
              item={item}
              selected={selected}
              indeterminate={hasPartialValues}
              onToggle={() => toggleItem(item)}
              selection={selection}
              onValuesChange={values => updateItemValues(item, values)}
              valuesLabel={valuesLabel}
              unavailable={item.unavailable}
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
