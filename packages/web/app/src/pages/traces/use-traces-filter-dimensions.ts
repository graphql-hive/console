import { useMemo } from 'react';
import type {
  FilterDimension,
  FilterItem,
  FilterSelection,
} from '@/components/ui/filters/filter-menu/types';
import {
  decodeIdSelections,
  encodeIdSelections,
  urlFilterDimension,
} from '@/components/ui/filters/filter-menu/url-filter';
import type { useNavigate } from '@tanstack/react-router';
import { TRACES_DURATION_BOUNDS, type TracesFilter } from './traces-search';

type NavigateFn = ReturnType<typeof useNavigate>;

export type TracesFilterValueList = { values: string[]; truncated: boolean };

type ValueKey =
  | 'operationNames'
  | 'clientNames'
  | 'subgraphNames'
  | 'errorCodes'
  | 'httpStatusCodes'
  | 'httpMethods'
  | 'httpHosts'
  | 'httpRoutes'
  | 'httpUrls';

export type TracesFilterValues = Record<ValueKey, TracesFilterValueList>;

const STATUS_ITEMS: FilterItem[] = [
  { id: 'ok', name: 'Ok', values: [] },
  { id: 'error', name: 'Error', values: [] },
];

const OPERATION_TYPE_ITEMS: FilterItem[] = [
  { id: 'query', name: 'Query', values: [] },
  { id: 'mutation', name: 'Mutation', values: [] },
  { id: 'subscription', name: 'Subscription', values: [] },
  { id: 'unknown', name: 'Unknown', values: [] },
];

/** The range's values, plus any selected value the range lacks, kept and struck through. */
export function nameItems(values: string[], selected: string[] | undefined): FilterItem[] {
  const items = values.map<FilterItem>(name => ({ name, values: [] }));
  const known = new Set(values);
  for (const name of selected ?? []) {
    if (!known.has(name)) {
      items.push({ name, values: [], unavailable: true });
    }
  }
  return items;
}

const decodeNames = (value: unknown): FilterSelection[] =>
  Array.isArray(value) ? value.map(name => ({ name: String(name), values: null })) : [];

const encodeNames = (selections: FilterSelection[]) =>
  selections.length > 0 ? selections.map(s => s.name) : undefined;

const NAME_DIMENSIONS: Array<{ key: ValueKey; label: string; labelPlural?: string }> = [
  { key: 'operationNames', label: 'Operation name' },
  { key: 'clientNames', label: 'Client' },
  { key: 'subgraphNames', label: 'Subgraph' },
  { key: 'errorCodes', label: 'Error code' },
  { key: 'httpStatusCodes', label: 'HTTP status', labelPlural: 'HTTP statuses' },
  { key: 'httpMethods', label: 'HTTP method', labelPlural: 'HTTP methods' },
  { key: 'httpHosts', label: 'HTTP host', labelPlural: 'HTTP hosts' },
  { key: 'httpRoutes', label: 'HTTP route', labelPlural: 'HTTP routes' },
  { key: 'httpUrls', label: 'HTTP URL', labelPlural: 'HTTP URLs' },
];

const EMPTY_LIST: TracesFilterValueList = { values: [], truncated: false };

/**
 * The traces filters, in the order of the `TracesDimensions` preview, each wired to its flat URL
 * param. `values` are the period's lists from `tracesFilterValues`, undefined while loading.
 */
export function useTracesFilterDimensions({
  search,
  navigate,
  values,
}: {
  search: TracesFilter;
  navigate: NavigateFn;
  values: TracesFilterValues | undefined;
}): FilterDimension[] {
  return useMemo<FilterDimension[]>(() => {
    const write = (next: Partial<TracesFilter>) =>
      void navigate({
        search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
      } as Parameters<NavigateFn>[0]);

    const status: FilterDimension = {
      ...urlFilterDimension({
        navigate,
        search,
        searchKey: 'status',
        key: 'status',
        label: 'Status',
        items: STATUS_ITEMS,
        encode: selections => selections[0]?.id,
        decode: value => decodeIdSelections(value ? [value] : [], STATUS_ITEMS),
      }),
      labelPlural: 'statuses',
      singleSelect: true,
    };

    const duration: FilterDimension = {
      key: 'duration',
      label: 'Duration',
      kind: 'range',
      bounds: TRACES_DURATION_BOUNDS,
      unit: 'ms',
      value: { min: search.durationMin ?? null, max: search.durationMax ?? null },
      onChange: next =>
        write({ durationMin: next.min ?? undefined, durationMax: next.max ?? undefined }),
    };

    const operationType = urlFilterDimension({
      navigate,
      search,
      searchKey: 'operationTypes',
      key: 'operationType',
      label: 'Operation type',
      items: OPERATION_TYPE_ITEMS,
      encode: encodeIdSelections,
      decode: value => decodeIdSelections(value, OPERATION_TYPE_ITEMS),
    });

    const names = NAME_DIMENSIONS.map<FilterDimension>(({ key, label, labelPlural }) => {
      const list = values?.[key] ?? EMPTY_LIST;
      return {
        ...urlFilterDimension({
          navigate,
          search,
          searchKey: key,
          key,
          label,
          items: nameItems(list.values, search[key]),
          encode: encodeNames,
          decode: decodeNames,
        }),
        labelPlural,
        truncatedTo: list.truncated ? list.values.length : undefined,
      };
    });

    const traceIds: FilterDimension = {
      key: 'traceIds',
      label: 'Trace ID',
      kind: 'text-list',
      values: search.traceIds ?? [],
      onChange: next => write({ traceIds: next.length > 0 ? next : undefined }),
      placeholder: 'Paste or type a trace ID',
      countNoun: 'id',
    };

    return [status, duration, operationType, ...names, traceIds];
  }, [navigate, search, values]);
}
