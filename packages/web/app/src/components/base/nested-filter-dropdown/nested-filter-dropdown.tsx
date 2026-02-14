import { useState } from 'react';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '@/components/base/menu/menu';
import { TriggerButton } from '@/components/base/trigger-button';
import { NestedFilterContent } from './nested-filter-content';
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

  const selectedCount = value.length;

  return (
    <MenuRoot open={open} onOpenChange={setOpen} modal={false}>
      <MenuTrigger
        render={
          <TriggerButton
            label={label}
            badge={selectedCount > 0 ? selectedCount : undefined}
            variant={selectedCount > 0 ? 'active' : 'default'}
          />
        }
      />

      <MenuContent side="bottom" align="start" sideOffset={8}>
        <NestedFilterContent
          label={label}
          items={items}
          value={value}
          onChange={onChange}
          valuesLabel={valuesLabel}
        />

        <MenuSeparator />

        {selectedCount > 0 && (
          <MenuItem variant="action" closeOnClick={false} onClick={() => onChange([])}>
            Clear current selections
          </MenuItem>
        )}
        <div className="mb-1">
          <MenuItem
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
