import { forwardRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Menu, MenuItem } from '@/components/base/menu/menu';
import { TriggerButton } from '@/components/base/trigger-button';
import { FilterContent } from './filter-content';
import type { FilterItem, FilterSelection } from './types';

export type FilterDropdownProps = {
  /** Label shown on the trigger button */
  label: string;
  /** Available items and their sub-values */
  items: FilterItem[];
  /** Currently selected items */
  selectedItems: FilterSelection[];
  /** Called when selection changes */
  onChange: (value: FilterSelection[]) => void;
  /** Called when the entire filter is removed */
  onRemove: () => void;
  /** Label for the sub-values (e.g. "versions", "endpoints"). Used in accessibility labels. */
  valuesLabel?: string;
  /** When true, the trigger is visually dimmed and the menu cannot be opened */
  disabled?: boolean;
  /** When true, selected items are excluded instead of included */
  excludeMode?: boolean;
  /** Called when the exclude mode changes */
  onExcludeModeChange?: (exclude: boolean) => void;
};

export function FilterDropdown({
  label,
  items,
  selectedItems,
  onChange,
  onRemove,
  valuesLabel = 'values',
  disabled,
  excludeMode,
  onExcludeModeChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedCount = selectedItems.length;

  const trigger = onExcludeModeChange ? (
    <FilterDropdownTrigger
      label={label}
      selectedCount={selectedCount}
      excludeMode={excludeMode ?? false}
      onExcludeModeChange={onExcludeModeChange}
      disabled={disabled}
    />
  ) : (
    <TriggerButton
      accessoryInformation={selectedCount > 0 ? selectedCount.toString() : undefined}
      disabled={disabled}
      label={label}
      rightIcon={{ icon: ChevronDown, withSeparator: true }}
    />
  );

  return (
    <Menu
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
      modal={false}
      lockScroll
      side="bottom"
      align="start"
      maxWidth="lg"
      stableWidth
      sections={[
        <FilterContent
          key="content"
          label={label}
          items={items}
          selectedItems={selectedItems}
          onChange={onChange}
          valuesLabel={valuesLabel}
          excludeMode={excludeMode}
          onExcludeModeChange={onExcludeModeChange}
        />,
        <MenuItem
          key="remove"
          variant="destructiveAction"
          onClick={() => {
            onRemove();
            setOpen(false);
          }}
        >
          Remove filter
        </MenuItem>,
      ]}
    />
  );
}

/**
 * Custom trigger that renders the label, an inline "is" / "is not" operator toggle,
 * the count badge, and the chevron — all in a single chip.
 */
const FilterDropdownTrigger = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    selectedCount: number;
    excludeMode: boolean;
    onExcludeModeChange: (exclude: boolean) => void;
    disabled?: boolean;
  }
>(function FilterDropdownTrigger(
  { label, selectedCount, excludeMode, onExcludeModeChange, disabled, ...domProps },
  ref,
) {
  const [operatorOpen, setOperatorOpen] = useState(false);

  return (
    <button
      ref={ref}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      className="group inline-flex items-center rounded-sm border text-xs font-medium transition-colors bg-neutral-2 border-neutral-5 hover:bg-neutral-1 hover:border-neutral-5 text-neutral-9 hover:text-neutral-11 dark:text-neutral-11 dark:bg-neutral-3 dark:border-neutral-4 dark:hover:bg-neutral-4 dark:hover:border-neutral-5"
      {...domProps}
    >
      <span className="px-3 py-1.5 text-[13px]">{label}</span>
      <span className="border-l [border-left-color:inherit]">
        <Menu
          trigger={
            <button
              type="button"
              className="px-2 py-1.5 text-[13px] hover:text-neutral-12 transition-colors cursor-pointer"
              onPointerDown={e => {
                e.stopPropagation();
              }}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              {excludeMode ? 'is not' : 'is'}
            </button>
          }
          open={operatorOpen}
          onOpenChange={setOperatorOpen}
          modal={false}
          side="bottom"
          align="start"
          maxWidth="sm"
          sections={[
            [
              <MenuItem
                key="is"
                onClick={() => {
                  onExcludeModeChange(false);
                  setOperatorOpen(false);
                }}
              >
                is
              </MenuItem>,
              <MenuItem
                key="is-not"
                onClick={() => {
                  onExcludeModeChange(true);
                  setOperatorOpen(false);
                }}
              >
                is not
              </MenuItem>,
            ],
          ]}
        />
      </span>
      {selectedCount > 0 && (
        <span className="border-l [border-left-color:inherit] px-3 py-1.5">
          {selectedCount}
        </span>
      )}
      <span className="border-l [border-left-color:inherit] text-neutral-8 group-hover:text-neutral-12 flex items-center px-2 py-1.5 transition-colors">
        <ChevronDown className="size-4" />
      </span>
    </button>
  );
});
