import { type ReactNode } from 'react';
import { ListFilter, X } from 'lucide-react';
import { Switch } from '@/components/base/switch/switch';
import { Button } from '../../button/button';
import { FilterContent } from '../filter-dropdown/filter-content';
import { FilterDropdown } from '../filter-dropdown/filter-dropdown';
import { TextFilterChip } from '../filter-dropdown/text-filter-chip';
import { FloatingSearch } from '../floating-search';
import { Menu, MenuItem } from '../menu/menu';
import type {
  FilterDimension,
  ItemsFilterDimension,
  TextFilterDimension,
  ToggleFilterDimension,
} from './types';

export type {
  FilterDimension,
  FilterItem,
  FilterSelection,
  ItemsFilterDimension,
  TextFilterDimension,
  ToggleFilterDimension,
} from './types';

function isToggle(d: FilterDimension): d is ToggleFilterDimension {
  return d.kind === 'toggle';
}

function isText(d: FilterDimension): d is TextFilterDimension {
  return d.kind === 'text';
}

function isNotToggle(d: FilterDimension): d is ItemsFilterDimension | TextFilterDimension {
  return d.kind !== 'toggle';
}

/**
 * The trigger that opens a menu of dimensions. Each dimension opens a
 * sub-menu containing a `FilterContent` panel for picking items, or a text
 * input for `kind: 'text'`. `kind: 'toggle'` dimensions are switch rows and
 * are grouped into their own section below the rest, since they set a
 * preference rather than narrow the result set.
 *
 * Default trigger reads "Filter" with a list-filter icon. To swap the
 * trigger to a custom label with a clear-X icon (e.g. for an active saved
 * view), pass *both* `activeLabel` and `onClearActive` — they're a
 * matched pair, the trigger only morphs when both are present.
 *
 * Pass `extraSections` to inject additional menu content (e.g. saved-filter
 * sub-menus) below the dimensions list.
 */
export function FilterMenu({
  dimensions,
  extraSections = [],
  activeLabel,
  onClearActive,
}: {
  dimensions: FilterDimension[];
  extraSections?: Array<ReactNode | ReactNode[]>;
  /** Active-state label for the trigger. Pair with `onClearActive`. */
  activeLabel?: string;
  /** Handler for the trigger's clear-X icon. Pair with `onClearActive`. */
  onClearActive?: () => void;
}) {
  const dimensionSection = dimensions.filter(isNotToggle).map(d => (
    <Menu
      key={d.key}
      trigger={<MenuItem>{d.label}</MenuItem>}
      maxWidth="lg"
      stableWidth
      sections={[
        isText(d) ? (
          <FloatingSearch
            key="content"
            label={d.label.toLowerCase()}
            value={d.value}
            onSearch={d.onChange}
            placeholder={d.placeholder}
            withDivider={false}
          />
        ) : (
          <FilterContent
            key="content"
            label={d.label.toLowerCase()}
            items={d.items}
            selectedItems={d.selectedItems}
            onChange={d.onChange}
            valuesLabel={d.valuesLabel}
            singleSelect={d.singleSelect}
            alwaysShowSearch={d.alwaysShowSearch}
          />
        ),
      ]}
    />
  ));

  // The Switch is a visual indicator only — the row's own click handler drives
  // it, so clicking the switch itself doesn't toggle twice.
  const toggleSection = dimensions.filter(isToggle).map(d => (
    <MenuItem key={d.key} closeOnClick={false} onClick={() => d.onChange(!d.checked)}>
      <span className="flex-1">{d.label}</span>
      <Switch
        checked={d.checked}
        size="small"
        tabIndex={-1}
        aria-hidden
        style={{ cursor: 'inherit' }}
      />
    </MenuItem>
  ));

  const trigger =
    activeLabel && onClearActive ? (
      <Button
        label={activeLabel}
        variant="default"
        rightIcon={{
          icon: X,
          action: onClearActive,
          label: 'Clear active view',
          withSeparator: true,
        }}
      />
    ) : (
      <Button
        label="Filter"
        variant="default"
        rightIcon={{ icon: ListFilter, withSeparator: true }}
      />
    );

  return (
    <Menu
      trigger={trigger}
      modal={false}
      lockScroll
      side="bottom"
      align="start"
      sections={[dimensionSection, toggleSection, ...extraSections]}
    />
  );
}

/**
 * Renders a chip for each dimension that has an active value. Pair with
 * `FilterMenu` so users can manage filters from either the chip or the menu —
 * both views share the same `dimensions` array. `kind: 'toggle'` dimensions
 * get no chip; the switch inside the menu is their state indicator.
 */
export function FilterChips({ dimensions }: { dimensions: FilterDimension[] }) {
  return (
    <>
      {dimensions.map(d => {
        if (isToggle(d)) {
          return null;
        }

        if (isText(d)) {
          return d.value ? (
            <TextFilterChip
              key={d.key}
              label={d.label}
              value={d.value}
              onChange={d.onChange}
              onRemove={() => d.onChange('')}
              placeholder={d.placeholder}
            />
          ) : null;
        }

        return d.selectedItems.length > 0 ? (
          <FilterDropdown
            key={d.key}
            label={d.label}
            labelPlural={d.labelPlural}
            items={d.items}
            selectedItems={d.selectedItems}
            onChange={d.onChange}
            onRemove={d.onRemove ?? (() => d.onChange([]))}
            valuesLabel={d.valuesLabel}
            excludeMode={d.excludeMode}
            onExcludeModeChange={d.onExcludeModeChange}
            singleSelect={d.singleSelect}
            alwaysShowSearch={d.alwaysShowSearch}
          />
        ) : null;
      })}
    </>
  );
}
