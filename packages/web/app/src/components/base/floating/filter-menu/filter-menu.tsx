import { type ReactNode } from 'react';
import { ListFilter, X } from 'lucide-react';
import { Button } from '../../button/button';
import { FilterDropdown } from '../filter-dropdown/filter-dropdown';
import { FilterContent } from '../filter-dropdown/filter-content';
import { Menu, MenuItem } from '../menu/menu';
import type { FilterDimension } from './types';

export type { FilterDimension, FilterItem, FilterSelection } from './types';

/**
 * The trigger that opens a menu of dimensions. Each dimension opens a
 * sub-menu containing a `FilterContent` panel for picking items.
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
  /** Handler for the trigger's clear-X icon. Pair with `activeLabel`. */
  onClearActive?: () => void;
}) {
  const dimensionSection = dimensions.map(d => (
    <Menu
      key={d.key}
      trigger={<MenuItem>{d.label}</MenuItem>}
      maxWidth="lg"
      stableWidth
      sections={[
        <FilterContent
          key="content"
          label={d.label.toLowerCase()}
          items={d.items}
          selectedItems={d.selectedItems}
          onChange={d.onChange}
          valuesLabel={d.valuesLabel}
        />,
      ]}
    />
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
      sections={[dimensionSection, ...extraSections]}
    />
  );
}

/**
 * Renders a `FilterDropdown` chip for each dimension that has at least one
 * selected item. Pair with `FilterMenu` so users can manage filters from
 * either the chip or the menu — both views share the same `dimensions` array.
 */
export function FilterChips({ dimensions }: { dimensions: FilterDimension[] }) {
  return (
    <>
      {dimensions
        .filter(d => d.selectedItems.length > 0)
        .map(d => (
          <FilterDropdown
            key={d.key}
            label={d.label}
            items={d.items}
            selectedItems={d.selectedItems}
            onChange={d.onChange}
            onRemove={d.onRemove ?? (() => d.onChange([]))}
            valuesLabel={d.valuesLabel}
            excludeMode={d.excludeMode}
            onExcludeModeChange={d.onExcludeModeChange}
          />
        ))}
    </>
  );
}
