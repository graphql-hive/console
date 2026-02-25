import type { FilterSelection } from '@/components/base/filter-dropdown/types';
import { stripNullValues } from '@/lib/route-utils';

/** Convert operation filter selections to URL search param format. */
export function selectionsToOperations(
  selections: FilterSelection[],
): string[] | undefined {
  return selections.length > 0 ? selections.map(s => s.id ?? s.name) : undefined;
}

/** Convert client filter selections to URL search param format. */
export function selectionsToClients(selections: FilterSelection[]) {
  return selections.length > 0
    ? selections.map(s => stripNullValues({ name: s.name, versions: s.values }))
    : undefined;
}

/**
 * Build insights search params from a saved filter (or any object with the same shape).
 * Works with both SavedFilterView and the raw GraphQL result node.
 */
export function savedFilterToSearchParams(filter: {
  id: string;
  filters: {
    operationHashes: string[];
    clientFilters: ReadonlyArray<{ name: string; versions?: string[] | null }>;
    dateRange?: { from: string; to: string } | null;
  };
}) {
  return {
    operations:
      filter.filters.operationHashes.length > 0 ? filter.filters.operationHashes : undefined,
    clients:
      filter.filters.clientFilters.length > 0
        ? filter.filters.clientFilters.map(c =>
            stripNullValues({ name: c.name, versions: c.versions ?? null }),
          )
        : undefined,
    from: filter.filters.dateRange?.from,
    to: filter.filters.dateRange?.to,
    viewId: filter.id,
  };
}
