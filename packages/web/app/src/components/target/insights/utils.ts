import type { SavedFilterView } from '@/components/target/insights/use-insights-filter-extra-sections';

export type CurrentFilters = {
  operations: string[];
  clients: Array<{ name: string; versions: string[] | null }>;
  dateRange: { from: string; to: string };
  excludeOperations: boolean;
  excludeClientFilters: boolean;
  schemaCoordinates: string[];
  subgraphNames: string[];
};

export function toInsightsFilterInput(currentFilters: CurrentFilters) {
  return {
    operationHashes: currentFilters.operations,
    clientFilters: currentFilters.clients.map(c => ({
      name: c.name,
      versions: c.versions,
    })),
    dateRange: {
      from: currentFilters.dateRange.from,
      to: currentFilters.dateRange.to,
    },
    excludeOperations: currentFilters.excludeOperations,
    excludeClientFilters: currentFilters.excludeClientFilters,
    schemaCoordinates: currentFilters.schemaCoordinates,
    subgraphNames: currentFilters.subgraphNames,
  };
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

function normalizeClients(arr: Array<{ name: string; versions: string[] | null }>) {
  return JSON.stringify(
    arr
      .map(c => ({ name: c.name, versions: c.versions }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export function hasUnsavedChanges(activeView: SavedFilterView, currentFilters: CurrentFilters) {
  if (!sameSet(currentFilters.operations, activeView.filters.operationHashes)) return true;
  if (!sameSet(currentFilters.schemaCoordinates, activeView.filters.schemaCoordinates)) return true;
  if (!sameSet(currentFilters.subgraphNames, activeView.filters.subgraphNames)) return true;
  if (
    normalizeClients(currentFilters.clients) !== normalizeClients(activeView.filters.clientFilters)
  )
    return true;
  if (
    currentFilters.dateRange.from !== activeView.filters.dateRange?.from ||
    currentFilters.dateRange.to !== activeView.filters.dateRange?.to
  )
    return true;
  if (currentFilters.excludeOperations !== activeView.filters.excludeOperations) return true;
  if (currentFilters.excludeClientFilters !== activeView.filters.excludeClientFilters) return true;
  return false;
}

export function resolutionToMilliseconds(
  resolution: number,
  period: {
    from: string;
    to: string;
  },
) {
  const distanceInMinutes =
    (new Date(period.to).getTime() - new Date(period.from).getTime()) / 1000 / 60;

  return Math.round(distanceInMinutes / resolution) * 1000 * 60;
}
