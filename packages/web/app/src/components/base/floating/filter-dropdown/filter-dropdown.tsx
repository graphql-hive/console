import { useState } from 'react';
import { X } from 'lucide-react';
import { buttonVariants } from '@/components/base/button/button';
import { disabledStyle, segmentButton, segmentSeparator } from '@/components/base/shared-styles';
import { pluralize } from '@/lib/utils';
import { Menu, MenuItem } from '../menu/menu';
import { FilterContent } from './filter-content';
import type { FilterItem, FilterSelection } from './types';

export type FilterDropdownProps = {
  /** Singular label shown on the trigger button. */
  label: string;
  /**
   * Plural form of `label` for the chip count (e.g. "severities" for
   * "severity"). Defaults to `${label.toLowerCase()}s`, which is wrong for
   * words like "severity" or "status" — provide an explicit plural there.
   */
  labelPlural?: string;
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

const chipClass = buttonVariants({ variant: 'default' });

export function FilterDropdown({
  label,
  labelPlural,
  items,
  selectedItems,
  onChange,
  onRemove,
  valuesLabel = 'values',
  disabled,
  excludeMode,
  onExcludeModeChange,
}: FilterDropdownProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const selectedCount = selectedItems.length;
  const singular = label.toLowerCase();
  const plural = labelPlural ?? `${singular}s`;
  const countLabel = `${selectedCount} ${pluralize(selectedCount, singular, plural)}`;

  return (
    <div
      role="group"
      aria-label={`${label} filter`}
      className={chipClass}
      style={disabled ? disabledStyle : undefined}
    >
      {/* Label — static */}
      <span className="px-2.5 py-1.5 text-[13px]">{label}</span>

      {/* Operator — dropdown for "is" / "is not" */}
      {onExcludeModeChange && (
        <span className={segmentSeparator}>
          <Menu
            trigger={
              <button
                type="button"
                className={segmentButton}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                {excludeMode ? 'is not' : 'is'}
              </button>
            }
            modal={false}
            side="bottom"
            align="start"
            maxWidth="sm"
            minWidth="none"
            sections={[
              [
                <MenuItem key="is" onClick={() => onExcludeModeChange(false)}>
                  is
                </MenuItem>,
                <MenuItem key="is-not" onClick={() => onExcludeModeChange(true)}>
                  is not
                </MenuItem>,
              ],
            ]}
          />
        </span>
      )}

      {/* Count — opens the main filter dropdown */}
      <span className={segmentSeparator}>
        <Menu
          trigger={
            <button type="button" className={segmentButton}>
              {countLabel}
            </button>
          }
          open={filterOpen}
          onOpenChange={setFilterOpen}
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
            />,
          ]}
        />
      </span>

      {/* Remove button */}
      <button
        type="button"
        className={`${segmentSeparator} text-neutral-8 hover:text-neutral-12 flex cursor-pointer items-center px-2 py-1.5 transition-colors`}
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
