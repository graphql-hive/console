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
