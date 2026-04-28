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
