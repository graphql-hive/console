import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { FilterListSearch } from '@/components/base/filter-dropdown/filter-list-search';
import { MenuItem } from '@/components/base/menu/menu';

type ValuesSubPanelProps = {
  itemName: string;
  values: string[];
  selectedValues: string[] | null; // null = all values
  onValuesChange: (values: string[] | null) => void;
  valuesLabel: string;
};

export function ValuesSubPanel({
  itemName,
  values,
  selectedValues,
  onValuesChange,
  valuesLabel,
}: ValuesSubPanelProps) {
  const [search, setSearch] = useState('');

  const allSelected = selectedValues === null;

  const filteredValues = useMemo(
    () => values.filter(v => v.toLowerCase().includes(search.toLowerCase())),
    [values, search],
  );

  function isValueSelected(val: string) {
    if (selectedValues === null) return true;
    return selectedValues.includes(val);
  }

  function toggleValue(val: string) {
    if (selectedValues === null) {
      // Was "all" → deselect this one, select all others
      onValuesChange(values.filter(v => v !== val));
    } else if (selectedValues.includes(val)) {
      const next = selectedValues.filter(v => v !== val);
      onValuesChange(next.length === 0 ? [] : next);
    } else {
      const next = [...selectedValues, val];
      // If all selected, switch back to null (all)
      onValuesChange(next.length === values.length ? null : next);
    }
  }

  function toggleAllValues() {
    if (allSelected) {
      onValuesChange([]);
    } else {
      onValuesChange(null);
    }
  }

  return (
    <div>
      <FilterListSearch
        label={`Search ${valuesLabel} for ${itemName}`}
        onSearch={setSearch}
        value={search}
      />

      {/* Values list */}
      <div className="max-h-64 overflow-y-auto [scrollbar-color:var(--color-neutral-7)_transparent] [scrollbar-width:thin]">
        {/* All values toggle */}
        <MenuItem closeOnClick={false} onClick={toggleAllValues}>
          <Checkbox checked={allSelected} size="sm" visual />
          <span>All {valuesLabel}</span>
        </MenuItem>

        {/* Individual values */}
        {filteredValues.map(val => {
          const checked = isValueSelected(val);
          return (
            <MenuItem key={val} closeOnClick={false} onClick={() => toggleValue(val)}>
              <Checkbox checked={checked} size="sm" visual />
              <span className="truncate">{val}</span>
            </MenuItem>
          );
        })}
        {filteredValues.length === 0 && (
          <div className="text-neutral-8 px-2 py-4 text-center text-sm">No {valuesLabel} found</div>
        )}
      </div>
    </div>
  );
}
