import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronRight, Minus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox, CheckboxIndicator } from '@/components/base/checkbox';
import {
  Popover,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from '@/components/base/popover';

export interface FilterItem {
  name: string;
  values: string[];
}

export interface FilterSelection {
  name: string;
  values: string[] | null; // null = all values
}

export interface NestedFilterDropdownProps {
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
}

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
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const subPanelCloseTimeout = useRef<ReturnType<typeof setTimeout>>();
  const subPanelRef = useRef<HTMLDivElement>(null);

  const openSubPanel = useCallback((name: string) => {
    clearTimeout(subPanelCloseTimeout.current);
    setActiveItem(name);
  }, []);

  const scheduleCloseSubPanel = useCallback(() => {
    subPanelCloseTimeout.current = setTimeout(() => setActiveItem(null), 150);
  }, []);

  const cancelCloseSubPanel = useCallback(() => {
    clearTimeout(subPanelCloseTimeout.current);
  }, []);

  const selectedCount = value.length;

  const filteredItems = useMemo(
    () =>
      items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );

  const isItemSelected = useCallback(
    (name: string) => value.some(s => s.name === name),
    [value],
  );

  const getItemSelection = useCallback(
    (name: string) => value.find(s => s.name === name) ?? null,
    [value],
  );

  const toggleItem = useCallback(
    (name: string) => {
      if (isItemSelected(name)) {
        onChange(value.filter(s => s.name !== name));
      } else {
        onChange([...value, { name, values: null }]);
      }
    },
    [value, onChange, isItemSelected],
  );

  const updateItemValues = useCallback(
    (name: string, values: string[] | null) => {
      const existing = value.find(s => s.name === name);
      if (existing) {
        onChange(value.map(s => (s.name === name ? { ...s, values } : s)));
      } else {
        onChange([...value, { name, values }]);
      }
    },
    [value, onChange],
  );

  const clearSelections = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setActiveIndex(i => Math.min(i + 1, filteredItems.length - 1));
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setActiveIndex(i => Math.max(i - 1, 0));
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filteredItems.length) {
            toggleItem(filteredItems[activeIndex].name);
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filteredItems.length) {
            setActiveItem(filteredItems[activeIndex].name);
          }
          break;
        }
        case 'Escape': {
          if (activeItem) {
            e.preventDefault();
            e.stopPropagation();
            setActiveItem(null);
          }
          break;
        }
      }
    },
    [activeIndex, filteredItems, toggleItem, activeItem],
  );

  // Prevent the outer Popover from closing when clicking inside the sub-panel
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (
        !nextOpen &&
        subPanelRef.current?.contains(document.activeElement as Node)
      ) {
        return;
      }
      setOpen(nextOpen);
    },
    [],
  );

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          'border-neutral-5 dark:border-neutral-6 text-neutral-11',
          'hover:bg-neutral-3 dark:hover:bg-neutral-5',
          open && 'bg-neutral-3 dark:bg-neutral-5',
        )}
        aria-haspopup="listbox"
      >
        {label}
        {selectedCount > 0 && (
          <span className="bg-neutral-5 dark:bg-neutral-6 text-neutral-12 inline-flex size-5 items-center justify-center rounded text-xs font-semibold">
            {selectedCount}
          </span>
        )}
        <ChevronDown className="size-4 opacity-50" />
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverPositioner side="bottom" align="start" sideOffset={4}>
          <PopoverPopup size="sm" className="w-72">
            {/* Search */}
            <div className="relative">
              <Search className="text-neutral-8 pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                role="searchbox"
                aria-label={`Search ${label.toLowerCase()}`}
                placeholder="Search..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setActiveIndex(-1);
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
            <div
              role="listbox"
              id={listboxId}
              aria-multiselectable="true"
              aria-label={`${label} filters`}
              className="mt-2 max-h-64 overflow-y-auto"
              tabIndex={0}
              onKeyDown={handleListKeyDown}
            >
              {filteredItems.map((item, index) => {
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
                    focused={activeIndex === index}
                    onToggle={() => toggleItem(item.name)}
                    expanded={activeItem === item.name}
                    selection={selection}
                    onValuesChange={values =>
                      updateItemValues(item.name, values)
                    }
                    valuesLabel={valuesLabel}
                    onOpenSubPanel={openSubPanel}
                    onScheduleCloseSubPanel={scheduleCloseSubPanel}
                    onCancelCloseSubPanel={cancelCloseSubPanel}
                    subPanelRef={subPanelRef}
                  />
                );
              })}
              {filteredItems.length === 0 && (
                <div className="text-neutral-8 px-2 py-4 text-center text-sm">
                  No items found
                </div>
              )}
            </div>

            {/* Footer actions */}
            {selectedCount > 0 && (
              <div className="border-neutral-4 dark:border-neutral-5 mt-2 border-t pt-2">
                <button
                  type="button"
                  onClick={clearSelections}
                  className="text-yellow-500 hover:text-yellow-400 w-full px-2 py-1 text-left text-sm"
                >
                  Clear current selections
                </button>
              </div>
            )}
            <div className={cn(selectedCount === 0 && 'border-neutral-4 dark:border-neutral-5 mt-2 border-t pt-2')}>
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  setOpen(false);
                }}
                className="text-red-400 hover:bg-red-500/10 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors"
              >
                Remove filter
              </button>
            </div>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}

// ---------- ItemRow ----------

interface ItemRowProps {
  item: FilterItem;
  selected: boolean;
  indeterminate: boolean;
  focused: boolean;
  onToggle: () => void;
  expanded: boolean;
  selection: FilterSelection | null;
  onValuesChange: (values: string[] | null) => void;
  valuesLabel: string;
  onOpenSubPanel: (name: string) => void;
  onScheduleCloseSubPanel: () => void;
  onCancelCloseSubPanel: () => void;
  subPanelRef: React.RefObject<HTMLDivElement | null>;
}

function ItemRow({
  item,
  selected,
  indeterminate,
  focused,
  onToggle,
  expanded,
  selection,
  onValuesChange,
  valuesLabel,
  onOpenSubPanel,
  onScheduleCloseSubPanel,
  onCancelCloseSubPanel,
  subPanelRef,
}: ItemRowProps) {
  const hasValues = item.values.length > 0;
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => {
        if (hasValues) {
          onOpenSubPanel(item.name);
        } else {
          onScheduleCloseSubPanel();
        }
      }}
      onMouseLeave={onScheduleCloseSubPanel}
    >
      <div
        role="option"
        aria-selected={selected}
        aria-checked={selected && !indeterminate ? 'true' : indeterminate ? 'mixed' : 'false'}
        tabIndex={-1}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          'hover:bg-neutral-3 dark:hover:bg-neutral-5',
          selected && 'bg-neutral-3 dark:bg-neutral-5',
          focused && 'ring-1 ring-yellow-500 ring-inset',
        )}
        onClick={onToggle}
      >
        <Checkbox
          checked={selected}
          indeterminate={indeterminate}
          onCheckedChange={() => onToggle()}
          size="sm"
          tabIndex={-1}
        >
          <CheckboxIndicator>
            {indeterminate ? (
              <Minus className="size-3" strokeWidth={3} />
            ) : (
              <Check className="size-3" strokeWidth={3} />
            )}
          </CheckboxIndicator>
        </Checkbox>

        <span className="text-neutral-11 flex-1 truncate">{item.name}</span>

        {hasValues && (
          <span
            className={cn(
              'text-neutral-8 rounded p-0.5',
              expanded && 'text-neutral-11',
            )}
          >
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>

      {expanded && hasValues && (
        <SubPanelPortal
          anchorRef={rowRef}
          subPanelRef={subPanelRef}
          onMouseEnter={onCancelCloseSubPanel}
          onMouseLeave={onScheduleCloseSubPanel}
        >
          <ValuesSubPanel
            itemName={item.name}
            values={item.values}
            selectedValues={selection?.values ?? null}
            onValuesChange={onValuesChange}
            valuesLabel={valuesLabel}
          />
        </SubPanelPortal>
      )}
    </div>
  );
}

// ---------- SubPanelPortal ----------

interface SubPanelPortalProps {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  subPanelRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}

function SubPanelPortal({
  anchorRef,
  subPanelRef,
  onMouseEnter,
  onMouseLeave,
  children,
}: SubPanelPortalProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({ top: rect.top, left: rect.right + 4 });
  }, [anchorRef]);

  if (!position) return null;

  return createPortal(
    <div
      ref={subPanelRef}
      style={{ position: 'fixed', top: position.top, left: position.left }}
      className={cn(
        'z-[100] w-56 rounded-md border p-2 shadow-md',
        'bg-neutral-1 border-neutral-4 dark:bg-neutral-4 dark:border-neutral-5',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body,
  );
}

// ---------- ValuesSubPanel ----------

interface ValuesSubPanelProps {
  itemName: string;
  values: string[];
  selectedValues: string[] | null; // null = all values
  onValuesChange: (values: string[] | null) => void;
  valuesLabel: string;
}

function ValuesSubPanel({
  itemName,
  values,
  selectedValues,
  onValuesChange,
  valuesLabel,
}: ValuesSubPanelProps) {
  const [search, setSearch] = useState('');
  const subListboxId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allSelected = selectedValues === null;

  const filteredValues = useMemo(
    () =>
      values.filter(v =>
        v.toLowerCase().includes(search.toLowerCase()),
      ),
    [values, search],
  );

  const isValueSelected = useCallback(
    (val: string) => {
      if (selectedValues === null) return true;
      return selectedValues.includes(val);
    },
    [selectedValues],
  );

  const toggleValue = useCallback(
    (val: string) => {
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
    },
    [selectedValues, values, onValuesChange],
  );

  const toggleAllValues = useCallback(() => {
    if (allSelected) {
      onValuesChange([]);
    } else {
      onValuesChange(null);
    }
  }, [allSelected, onValuesChange]);

  const handleSubPanelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [],
  );

  return (
    <div onKeyDown={handleSubPanelKeyDown}>
      {/* Search */}
      <div className="relative">
        <Search className="text-neutral-8 pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2" />
        <input
          ref={searchInputRef}
          type="text"
          role="searchbox"
          aria-label={`Search ${valuesLabel} for ${itemName}`}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={cn(
            'w-full rounded-md border py-1.5 pl-8 pr-2 text-sm outline-none',
            'bg-neutral-2 dark:bg-neutral-3 border-neutral-4 dark:border-neutral-5',
            'text-neutral-12 placeholder:text-neutral-8',
            'focus:ring-1 focus:ring-yellow-500',
          )}
        />
      </div>

      {/* Values list */}
      <div
        role="listbox"
        id={subListboxId}
        aria-multiselectable="true"
        aria-label={`${valuesLabel} for ${itemName}`}
        className="mt-2 max-h-48 overflow-y-auto"
        tabIndex={0}
      >
        {/* All values toggle */}
        <div
          role="option"
          aria-selected={allSelected}
          aria-checked={allSelected ? 'true' : 'false'}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
            'hover:bg-neutral-3 dark:hover:bg-neutral-5',
            allSelected && 'bg-neutral-3 dark:bg-neutral-5',
          )}
          onClick={toggleAllValues}
        >
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => toggleAllValues()}
            size="sm"
            tabIndex={-1}
          >
            <CheckboxIndicator>
              <Check className="size-3" strokeWidth={3} />
            </CheckboxIndicator>
          </Checkbox>
          <span className="text-neutral-11 font-medium">All {valuesLabel}</span>
        </div>

        {/* Individual values */}
        {filteredValues.map(val => {
          const checked = isValueSelected(val);
          return (
            <div
              key={val}
              role="option"
              aria-selected={checked}
              aria-checked={checked ? 'true' : 'false'}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                'hover:bg-neutral-3 dark:hover:bg-neutral-5',
              )}
              onClick={() => toggleValue(val)}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleValue(val)}
                size="sm"
                tabIndex={-1}
              >
                <CheckboxIndicator>
                  <Check className="size-3" strokeWidth={3} />
                </CheckboxIndicator>
              </Checkbox>
              <span className="text-neutral-11 truncate">{val}</span>
            </div>
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
