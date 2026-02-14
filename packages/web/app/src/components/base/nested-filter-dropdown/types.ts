export interface FilterItem {
  name: string;
  values: string[];
}

export interface FilterSelection {
  name: string;
  values: string[] | null; // null = all values
}
