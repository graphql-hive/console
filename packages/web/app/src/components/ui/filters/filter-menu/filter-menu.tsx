import { ListFilter, X } from 'lucide-react';
import { exhaustiveGuard } from '@/lib/utils';
import { Button } from '../../primitives/button/button';
import { FloatingSearch } from '../../primitives/floating/floating-search';
import { Menu, type MenuEntry, type MenuSection } from '../../primitives/floating/menu/menu';
import { FilterContent } from '../filter-dropdown/filter-content';
import { FilterDropdown } from '../filter-dropdown/filter-dropdown';
import { RangeFilterChip } from '../filter-dropdown/range-filter-chip';
import { RangeFilterPanel } from '../filter-dropdown/range-filter-panel';
import { TextFilterChip } from '../filter-dropdown/text-filter-chip';
import type { FilterDimension, ToggleFilterDimension } from './types';

export type {
  FilterDimension,
  FilterItem,
  FilterSelection,
  ItemsFilterDimension,
  RangeFilterDimension,
  RangeValue,
  TextFilterDimension,
  ToggleFilterDimension,
} from './types';

type SubmenuDimension = Exclude<FilterDimension, ToggleFilterDimension>;

function isToggle(d: FilterDimension): d is ToggleFilterDimension {
  return d.kind === 'toggle';
}

function isNotToggle(d: FilterDimension): d is SubmenuDimension {
  return d.kind !== 'toggle';
}

function submenuContent(d: SubmenuDimension) {
  switch (d.kind) {
    case 'text':
      return (
        <FloatingSearch
          label={d.label.toLowerCase()}
          value={d.value}
          onSearch={d.onChange}
          placeholder={d.placeholder}
          standalone
        />
      );
    case 'range':
      return (
        <RangeFilterPanel
          label={d.label}
          bounds={d.bounds}
          step={d.step}
          unit={d.unit}
          value={d.value}
          onChange={d.onChange}
        />
      );
    case undefined:
    case 'items':
      return (
        <FilterContent
          label={d.label.toLowerCase()}
          items={d.items}
          selectedItems={d.selectedItems}
          onChange={d.onChange}
          valuesLabel={d.valuesLabel}
          singleSelect={d.singleSelect}
          alwaysShowSearch={d.alwaysShowSearch}
        />
      );
    default:
      return exhaustiveGuard(d);
  }
}

export function FilterMenu({
  dimensions,
  extraSections = [],
  activeLabel,
  onClearActive,
}: {
  dimensions: FilterDimension[];
  extraSections?: MenuSection[];
  /** Active-state label for the trigger. Pair with `onClearActive`. */
  activeLabel?: string;
  /** Handler for the trigger's clear-X icon. Pair with `onClearActive`. */
  onClearActive?: () => void;
}) {
  const dimensionSection = dimensions.filter(isNotToggle).map<MenuEntry>(d => ({
    kind: 'submenu',
    label: d.label,
    maxWidth: 'lg',
    content: submenuContent(d),
  }));

  // The Switch is a visual indicator only — the row's own click handler drives
  // it, so clicking the switch itself doesn't toggle twice.
  const toggleSection = dimensions.filter(isToggle).map<MenuEntry>(d => ({
    kind: 'checkbox',
    label: d.label,
    checked: d.checked,
    onCheckedChange: d.onChange,
    indicator: 'switch',
  }));

  const trigger =
    activeLabel && onClearActive ? (
      <Button
        label={activeLabel}
        variant="default"
        size="compact"
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
        size="compact"
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
        switch (d.kind) {
          case 'toggle':
            return null;
          case 'text':
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
          case 'range':
            return d.value.min !== null || d.value.max !== null ? (
              <RangeFilterChip
                key={d.key}
                label={d.label}
                bounds={d.bounds}
                step={d.step}
                unit={d.unit}
                value={d.value}
                onChange={d.onChange}
                onRemove={() => d.onChange({ min: null, max: null })}
              />
            ) : null;
          case undefined:
          case 'items':
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
          default:
            return exhaustiveGuard(d);
        }
      })}
    </>
  );
}
