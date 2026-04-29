import { useMemo } from 'react';
import type {
  FilterDimension,
  FilterItem,
  FilterSelection,
} from '@/components/base/floating/filter-menu/types';
import { urlFilterDimension } from '@/components/base/floating/filter-menu/url-filter';
import {
  selectionsToClients,
  selectionsToOperations,
} from '@/components/target/insights/search-params';
import type { useNavigate } from '@tanstack/react-router';

type InsightsSearchShape = {
  operations?: string[];
  clients?: Array<{ name: string; versions: string[] | null }>;
  excludeOperations?: boolean;
  excludeClients?: boolean;
};

/**
 * Builds the FilterDimension array describing the Insights-page filters
 * (operations and clients), wired to URL search params via
 * `urlFilterDimension`. The page provides the picker-derived items and a
 * hash→name map (since URL-stored operations are hashes that need to be
 * displayed as operation names).
 */
export function useInsightsFilterDimensions({
  search,
  navigate,
  operationFilterItems,
  clientFilterItems,
  hashToNameMap,
}: {
  search: InsightsSearchShape;
  navigate: ReturnType<typeof useNavigate>;
  operationFilterItems: FilterItem[];
  clientFilterItems: FilterItem[];
  hashToNameMap: Map<string, string>;
}): FilterDimension[] {
  return useMemo<FilterDimension[]>(() => {
    const operationsDim = urlFilterDimension({
      navigate,
      search,
      searchKey: 'operations',
      excludeKey: 'excludeOperations',
      key: 'operation',
      label: 'Operation',
      items: operationFilterItems,
      encode: selectionsToOperations,
      decode: value => {
        if (!Array.isArray(value)) return [];
        return (value as string[]).map(hash => ({
          id: hash,
          name: hashToNameMap.get(hash) ?? hash,
          values: null,
        }));
      },
    });

    const clientsDim = urlFilterDimension({
      navigate,
      search,
      searchKey: 'clients',
      excludeKey: 'excludeClients',
      key: 'client',
      label: 'Client',
      items: clientFilterItems,
      valuesLabel: 'versions',
      encode: selectionsToClients,
      decode: value => {
        if (!Array.isArray(value)) return [];
        return (value as Array<{ name: string; versions: string[] | null }>).map<FilterSelection>(
          c => ({ name: c.name, values: c.versions }),
        );
      },
    });

    return [operationsDim, clientsDim];
  }, [
    navigate,
    search.operations,
    search.clients,
    search.excludeOperations,
    search.excludeClients,
    operationFilterItems,
    clientFilterItems,
    hashToNameMap,
  ]);
}
