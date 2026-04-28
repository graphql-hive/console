import { type ReactElement, type ReactNode } from 'react';
import { FilterDropdown } from '../filter-dropdown/filter-dropdown';
import { FilterContent } from '../filter-dropdown/filter-content';
import type { FilterItem, FilterSelection } from '../filter-dropdown/types';
import { Menu, MenuItem } from '../menu/menu';

export type FilterDimension = {
  /** Stable key for the dimension (used for React reconciliation). */
  key: string;
  /** Label shown in the menu and in the FilterContent search aria. */
  label: string;
  /** Items available for this dimension. Use `values: []` for flat (no sub-values). */
  items: FilterItem[];
  /** Currently selected items. */
  selectedItems: FilterSelection[];
  /** Called when the selection changes. */
  onChange: (next: FilterSelection[]) => void;
  /**
   * Called when the chip's X is clicked. Defaults to `onChange([])`. Override
   * if removing the chip should also clear other URL state (e.g. exclude flags).
   */
  onRemove?: () => void;
  /** Label for sub-values (e.g. "versions"). Only meaningful when items have values. */
  valuesLabel?: string;
  /** When true, the chip's "is/is not" toggle is shown and the chip indicates exclude. */
  excludeMode?: boolean;
  /** Called when the chip's "is/is not" toggle changes. Required to render the toggle. */
  onExcludeModeChange?: (exclude: boolean) => void;
};

/**
 * A single "Filter" trigger that opens a menu of dimensions. Each dimension
 * opens a sub-menu containing a `FilterContent` panel for picking items.
 *
 * Use `extraSections` to append other content (e.g. saved-filter lists) below
 * the dimensions.
 */
export function FilterMenu({
  trigger,
  dimensions,
  extraSections = [],
  open,
  onOpenChange,
}: {
  trigger: ReactElement;
  dimensions: FilterDimension[];
  extraSections?: Array<ReactNode | ReactNode[]>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

  return (
    <Menu
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
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
 * selected item. Pair with `FilterMenu` so users can manage filters from either
 * the chip or the menu — both views share the same `dimensions` array.
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
