export interface FilterItem {
  /** Optional unique identifier. When provided, used for matching instead of name. */
  id?: string;
  name: string;
  values: string[];
  /** When true, the item is not found in the current date range stats. */
  unavailable?: boolean;
}

export interface FilterSelection {
  /** Optional unique identifier. When provided, used for matching instead of name. */
  id?: string;
  name: string;
  values: string[] | null; // null = all values
}

type FilterDimensionBase = {
  /** Stable key for the dimension (used for React reconciliation). */
  key: string;
  /** Singular label shown in the menu and in the FilterContent search aria. */
  label: string;
};

/**
 * The default dimension: a checkbox list of items, optionally two-level when
 * items carry `values`. `kind` is optional so existing call sites that predate
 * the union keep working unchanged.
 */
export type ItemsFilterDimension = FilterDimensionBase & {
  kind?: 'items';
  /**
   * Plural form of `label` used in the chip count (e.g. "3 severities").
   * Defaults to `${label.toLowerCase()}s`, which is wrong for words like
   * "severity" or "status" — provide an explicit plural in those cases.
   */
  labelPlural?: string;
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
  /**
   * When true, picking an item replaces the selection instead of adding to it.
   * For dimensions that address a single thing (e.g. a route param), where two
   * checked boxes would be a state that cannot exist.
   */
  singleSelect?: boolean;
  /**
   * Show the item search regardless of list length. `FilterContent` otherwise
   * only reveals it at 15+ items, which is wrong for a dimension people arrive
   * at knowing what they want to type.
   */
  alwaysShowSearch?: boolean;
};

/** A free-text dimension. The value is rendered in a chip once non-empty. */
export type TextFilterDimension = FilterDimensionBase & {
  kind: 'text';
  /** Current value; empty string when unset. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

/**
 * A boolean dimension, rendered as a switch row in its own menu section.
 * Deliberately gets no chip — it's a display preference rather than something
 * that narrows results, and the switch is its own state indicator.
 */
export type ToggleFilterDimension = FilterDimensionBase & {
  kind: 'toggle';
  checked: boolean;
  onChange: (next: boolean) => void;
};

export type FilterDimension = ItemsFilterDimension | TextFilterDimension | ToggleFilterDimension;
