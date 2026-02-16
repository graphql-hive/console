export interface FilterItem {
  /** Optional unique identifier. When provided, used for matching instead of name. */
  id?: string;
  name: string;
  values: string[];
}

export interface FilterSelection {
  /** Optional unique identifier. When provided, used for matching instead of name. */
  id?: string;
  name: string;
  values: string[] | null; // null = all values
}
