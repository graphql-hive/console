import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '@/components/base/menu/menu';
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
};

export function FilterDropdown({
  label,
  items,
  selectedItems,
  onChange,
  onRemove,
  valuesLabel = 'values',
  disabled,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedCount = selectedItems.length;

  return (
    <MenuRoot open={open} onOpenChange={setOpen} modal={false}>
      <MenuTrigger
        render={
          <TriggerButton
            accessoryInformation={selectedCount > 0 ? selectedCount.toString() : undefined}
            disabled={disabled}
            label={label}
            rightIcon={{ icon: ChevronDown, withSeparator: true }}
          />
        }
      />

      <MenuContent side="bottom" align="start" sideOffset={8}>
        <FilterContent
          label={label}
          items={items}
          selectedItems={selectedItems}
          onChange={onChange}
          valuesLabel={valuesLabel}
        />

        <MenuSeparator />

        <div className="mb-1">
          <MenuItem
            inSubmenu
            variant="destructiveAction"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
          >
            Remove filter
          </MenuItem>
        </div>
      </MenuContent>
    </MenuRoot>
  );
}
