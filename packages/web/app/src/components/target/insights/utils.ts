import type { SavedFilterView } from '@/components/base/insights-filters';

export type CurrentFilters = {
  operations: string[];
  clients: Array<{ name: string; versions: string[] | null }>;
  dateRange: { from: string; to: string };
  excludeOperations: boolean;
  excludeClientFilters: boolean;
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
  };
}

function normalizeClients(arr: Array<{ name: string; versions: string[] | null }>) {
  return JSON.stringify(
    arr
      .map(c => ({ name: c.name, versions: c.versions }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export function hasUnsavedChanges(activeView: SavedFilterView, currentFilters: CurrentFilters) {
  if (
    JSON.stringify([...currentFilters.operations].sort()) !==
    JSON.stringify([...activeView.filters.operationHashes].sort())
  )
    return true;
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
