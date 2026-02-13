import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/base/menu';
import { cn } from '@/lib/utils';
import { ItemRow } from './item-row';
import type { FilterItem, FilterSelection } from './types';

export type NestedFilterDropdownProps = {
  /** Label shown on the trigger button */
  label: string;
  /** Available items and their sub-values */
  items: FilterItem[];
  /** Currently selected items/values */
  value: FilterSelection[];
  /** Called when selection changes */
  onChange: (value: FilterSelection[]) => void;
  /** Called when the entire filter is removed */
  onRemove: () => void;
  /** Label for the sub-values (e.g. "versions", "endpoints"). Used in accessibility labels. */
  valuesLabel?: string;
};

export function NestedFilterDropdown({
  label,
  items,
  value,
  onChange,
  onRemove,
  valuesLabel = 'values',
}: NestedFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCount = value.length;

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
    <MenuRoot open={open} onOpenChange={setOpen} modal={false}>
      <MenuTrigger
        className={cn(
          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          'border-neutral-5 dark:border-neutral-6 text-neutral-11',
          'hover:bg-neutral-3 dark:hover:bg-neutral-5',
          open && 'bg-neutral-3 dark:bg-neutral-5',
        )}
      >
        {label}
        {selectedCount > 0 && (
          <span className="bg-neutral-5 dark:bg-neutral-6 text-neutral-12 inline-flex size-5 items-center justify-center rounded-sm text-xs font-semibold">
            {selectedCount}
          </span>
        )}
        <ChevronDown className="size-4 opacity-50" />
      </MenuTrigger>

      <MenuContent side="bottom" align="start" sideOffset={8}>
        {/* Search */}
        <div className="relative">
          <Search className="text-neutral-8 pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2" />
          <input
            type="text"
            role="searchbox"
            aria-label={`Search ${label.toLowerCase()}`}
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

        {/* Footer actions */}
        {selectedCount > 0 && (
          <div className="border-neutral-4 dark:border-neutral-5 mt-2 border-t pt-2">
            <MenuItem
              closeOnClick={false}
              onClick={() => onChange([])}
              className="text-yellow-500 hover:text-yellow-400"
            >
              Clear current selections
            </MenuItem>
          </div>
        )}
        <div
          className={cn(
            selectedCount === 0 && 'border-neutral-4 dark:border-neutral-5 mt-2 border-t pt-2',
          )}
        >
          <MenuItem
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
            className="text-red-400 hover:bg-red-500/10"
          >
            Remove filter
          </MenuItem>
        </div>
      </MenuContent>
    </MenuRoot>
  );
}
