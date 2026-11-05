import type { FilterSelection } from '@/components/ui/filters/filter-dropdown/types';
import { stripNullValues } from '@/lib/route-utils';

/** Convert operation filter selections to URL search param format. */
export function selectionsToOperations(selections: FilterSelection[]): string[] | undefined {
  return selections.length > 0 ? selections.map(s => s.id ?? s.name) : undefined;
}

/** Convert client filter selections to URL search param format. */
export function selectionsToClients(selections: FilterSelection[]) {
  return selections.length > 0
    ? selections.map(s => stripNullValues({ name: s.name, versions: s.values }))
    : undefined;
}

/**
 * A saved filter's `filters` as any document selects it: the GraphQL result node, a
 * `SavedFilterView`, or the hand-written shapes the alert panels receive. Nullable flags are
 * accepted as-is so callers never have to re-map the object before passing it on.
 */
export type SavedFilterFilters = {
  operationHashes: readonly string[];
  clientFilters: ReadonlyArray<{ name: string; versions?: readonly string[] | null }>;
  dateRange?: { from: string; to: string } | null;
  excludeOperations?: boolean | null;
  excludeClientFilters?: boolean | null;
  schemaCoordinates?: readonly string[];
  subgraphNames?: readonly string[];
};

/** Build insights search params from a saved filter (or any object with the same shape). */
export function savedFilterToSearchParams(filter: { id: string; filters: SavedFilterFilters }) {
  return {
    operations:
      filter.filters.operationHashes.length > 0 ? [...filter.filters.operationHashes] : undefined,
    clients:
      filter.filters.clientFilters.length > 0
        ? filter.filters.clientFilters.map(c =>
            stripNullValues({ name: c.name, versions: c.versions ? [...c.versions] : null }),
          )
        : undefined,
    excludeOperations: filter.filters.excludeOperations || undefined,
    excludeClients: filter.filters.excludeClientFilters || undefined,
    fields: filter.filters.schemaCoordinates?.length
      ? [...filter.filters.schemaCoordinates]
      : undefined,
    subgraphs: filter.filters.subgraphNames?.length ? [...filter.filters.subgraphNames] : undefined,
    from: filter.filters.dateRange?.from,
    to: filter.filters.dateRange?.to,
    viewId: filter.id,
  };
}
