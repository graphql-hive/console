import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Checkbox, CheckboxIndicator } from '@/components/base/checkbox';
import { MenuItem } from '@/components/base/menu';
import { cn } from '@/lib/utils';

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
      {/* Search */}
      <div className="relative">
        <Search className="text-neutral-8 pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2" />
        <input
          type="text"
          role="searchbox"
          aria-label={`Search ${valuesLabel} for ${itemName}`}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Escape') {
              e.stopPropagation();
            }
          }}
          className={cn(
            'w-full rounded-md border py-1.5 pl-8 pr-2 text-sm outline-none',
            'bg-neutral-2 dark:bg-neutral-3 border-neutral-4 dark:border-neutral-5',
            'text-neutral-12 placeholder:text-neutral-8',
            'focus:ring-1 focus:ring-yellow-500',
          )}
        />
      </div>

      {/* Values list */}
      <div className="mt-2 max-h-48 overflow-y-auto">
        {/* All values toggle */}
        <MenuItem closeOnClick={false} onClick={toggleAllValues} className="gap-2">
          <Checkbox
            checked={allSelected}
            size="sm"
            tabIndex={-1}
            aria-hidden
            style={{ pointerEvents: 'none' }}
          >
            <CheckboxIndicator>
              <Check className="size-3" strokeWidth={3} />
            </CheckboxIndicator>
          </Checkbox>
          <span className="text-neutral-11 font-medium">All {valuesLabel}</span>
        </MenuItem>

        {/* Individual values */}
        {filteredValues.map(val => {
          const checked = isValueSelected(val);
          return (
            <MenuItem
              key={val}
              closeOnClick={false}
              onClick={() => toggleValue(val)}
              className="gap-2"
            >
              <Checkbox
                checked={checked}
                size="sm"
                tabIndex={-1}
                aria-hidden
                style={{ pointerEvents: 'none' }}
              >
                <CheckboxIndicator>
                  <Check className="size-3" strokeWidth={3} />
                </CheckboxIndicator>
              </Checkbox>
              <span className="text-neutral-11 truncate">{val}</span>
            </MenuItem>
          );
        })}
        {filteredValues.length === 0 && (
          <div className="text-neutral-8 px-2 py-4 text-center text-sm">
            No {valuesLabel} found
          </div>
        )}
      </div>
    </div>
  );
}
