// @vitest-environment jsdom
import type {
  FilterDimension,
  ItemsFilterDimension,
} from '@/components/ui/filters/filter-menu/types';
import { renderHook } from '@testing-library/react';
import type { TracesFilter } from './traces-search';
import {
  nameItems,
  useTracesFilterDimensions,
  type TracesFilterValueList,
  type TracesFilterValues,
} from './use-traces-filter-dimensions';

const list = (values: string[] = [], truncated = false): TracesFilterValueList => ({
  values,
  truncated,
});

const values = (overrides: Partial<TracesFilterValues> = {}): TracesFilterValues => ({
  operationNames: list(),
  clientNames: list(),
  subgraphNames: list(),
  errorCodes: list(),
  httpStatusCodes: list(),
  httpMethods: list(),
  httpHosts: list(),
  httpRoutes: list(),
  httpUrls: list(),
  ...overrides,
});

function dimensionsFor(search: TracesFilter, lists: TracesFilterValues | 'loading' = values()) {
  const navigate = vi.fn();
  const { result } = renderHook(() =>
    useTracesFilterDimensions({
      search,
      navigate: navigate as never,
      values: lists === 'loading' ? undefined : lists,
    }),
  );
  const byKey = (key: string) => result.current.find(d => d.key === key) as FilterDimension;
  // The URL the dimension's last write would produce, from `prev`.
  const lastWrite = (prev: Record<string, unknown>) =>
    navigate.mock.lastCall![0].search(prev) as Record<string, unknown>;
  return { dimensions: result.current, byKey, lastWrite };
}

describe('nameItems', () => {
  it('appends a selected value the range lacks, marked unavailable', () => {
    expect(nameItems(['GetUser'], ['GetUser', 'RequestInfo'])).toEqual([
      { name: 'GetUser', values: [] },
      { name: 'RequestInfo', values: [], unavailable: true },
    ]);
  });

  it('lists the selected values unmarked until the values arrive', () => {
    expect(nameItems(undefined, ['RequestInfo'])).toEqual([{ name: 'RequestInfo', values: [] }]);
  });
});

describe('useTracesFilterDimensions', () => {
  it('lists the dimensions in the planned order', () => {
    expect(dimensionsFor({}).dimensions.map(d => d.label)).toEqual([
      'Status',
      'Duration',
      'Operation type',
      'Operation name',
      'Client',
      'Subgraph',
      'Error code',
      'HTTP status',
      'HTTP method',
      'HTTP host',
      'HTTP route',
      'HTTP URL',
      'Trace ID',
    ]);
  });

  it('notes the cap only on a list the server truncated', () => {
    const urls = Array.from({ length: 1000 }, (_, i) => `https://acme.dev/${i}`);
    const { byKey } = dimensionsFor({}, values({ httpUrls: list(urls, true) }));
    expect((byKey('httpUrls') as ItemsFilterDimension).truncatedTo).toBe(1000);
    expect((byKey('httpHosts') as ItemsFilterDimension).truncatedTo).toBeUndefined();
  });

  it('keeps a selected name the range lacks, so its chip and struck-through row show', () => {
    const { byKey } = dimensionsFor(
      { operationNames: ['DoesNotExist'] },
      values({ operationNames: list(['GetUser']) }),
    );
    const operations = byKey('operationNames') as ItemsFilterDimension;
    expect(operations.selectedItems).toEqual([{ name: 'DoesNotExist', values: null }]);
    expect(operations.items.at(-1)).toEqual({
      name: 'DoesNotExist',
      values: [],
      unavailable: true,
    });
  });

  it('does not strike through a selected name while the values load', () => {
    const { byKey } = dimensionsFor({ operationNames: ['GetUser'] }, 'loading');
    const operations = byKey('operationNames') as ItemsFilterDimension;
    expect(operations.items).toEqual([{ name: 'GetUser', values: [] }]);
    expect(operations.truncatedTo).toBeUndefined();
  });

  it('writes duration bounds as flat params, clearing an unbounded side', () => {
    const { byKey, lastWrite } = dimensionsFor({ durationMax: 500 });
    const duration = byKey('duration');
    if (duration.kind !== 'range') throw new Error('expected a range');

    duration.onChange({ min: 100, max: null });
    expect(lastWrite({ from: 'now-1d', durationMax: 500 })).toEqual({
      from: 'now-1d',
      durationMin: 100,
      durationMax: undefined,
    });
  });

  it('picks one status and writes it as a single value', () => {
    const { byKey, lastWrite } = dimensionsFor({ status: 'ok' });
    const status = byKey('status') as ItemsFilterDimension;
    expect(status.singleSelect).toBe(true);
    expect(status.selectedItems.map(s => s.id)).toEqual(['ok']);

    status.onChange([{ id: 'error', name: 'Error', values: null }]);
    expect(lastWrite({})).toEqual({ status: 'error' });
  });

  it('writes operation types by id, and an empty trace id list clears the param', () => {
    const { byKey, lastWrite } = dimensionsFor({ traceIds: ['t1'] });
    const types = byKey('operationType') as ItemsFilterDimension;
    types.onChange([{ id: 'unknown', name: 'Unknown', values: null }]);
    expect(lastWrite({})).toEqual({ operationTypes: ['unknown'] });

    const traceIds = byKey('traceIds');
    if (traceIds.kind !== 'text-list') throw new Error('expected a text list');
    traceIds.onChange([]);
    expect(lastWrite({ traceIds: ['t1'] })).toEqual({ traceIds: undefined });
  });
});
